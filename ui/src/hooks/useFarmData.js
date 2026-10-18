import { useEffect, useRef, useState } from "react";
import { getFarm } from "../services/api.js";
import { accountFarm, sameData, saveFarmChanges } from "../services/farmChanges.js";
import { readDraft, writeDraft, clearDraft, draftKey } from "../services/draftStorage.js";
import { createEmptyFarm, syncCropRecords } from "../data/farmDefaults.js";
import { validateFarm } from "../utilis/validation.js";
import { todayISO } from "../utilis/calendarDates.js";

// Every page shares this farm. Local drafts are immediate; valid account saves are serialised and debounced.
export default function useFarmData(profile) {
  const [state, setState] = useState({
    farm: null,
    loading: true,
    error: "",
    status: "loading",
    message: "",
    problems: [],
    localError: "",
  });
  const [today, setToday] = useState(todayISO);
  const current = useRef(null);
  const server = useRef({ farm: null, version: 0, farmId: null });
  const raw = useRef(null);
  const sequence = useRef(0);
  const timer = useRef(null);
  const task = useRef(null);
  const active = useRef(false);
  const blocked = useRef(false);
  const localFailed = useRef(false);
  const saveLatest = useRef(null);

  function publish(change) {
    if (active.current) setState((previous) => ({ ...previous, ...change }));
  }
  function persistDraft(next) {
    try {
      raw.current = writeDraft(profile.id, next, server.current.version, raw.current, undefined, server.current.farmId);
      localFailed.current = false;
      publish({ localError: "" });
    } catch (error) {
      localFailed.current = true;
      if (error.message.includes("another tab")) blocked.current = true;
      publish({
        localError: error.message.includes("another tab")
          ? error.message
          : "Cannot keep this draft in browser storage. Export it before closing this tab.",
      });
    }
  }
  function dropDraft() {
    try {
      clearDraft(profile.id, raw.current);
      raw.current = null;
      localFailed.current = false;
      publish({ localError: "" });
    } catch (error) {
      blocked.current = true;
      publish({ localError: error.message });
    }
  }

  function schedule() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveLatest.current(), 800);
  }

  function setFarm(change) {
    const next = syncCropRecords(typeof change === "function" ? change(current.current) : change);
    current.current = next;
    sequence.current += 1;
    persistDraft(next);
    const problems = next.setupCompleted ? validateFarm(next) : [];
    publish({
      farm: next,
      status: blocked.current ? "conflict" : "draft",
      problems,
      message: blocked.current
        ? "These edits are still a draft. Load the saved version before trying to save again."
        : "",
    });
    schedule();
  }

  async function saveNow() {
    clearTimeout(timer.current);
    if (task.current) {
      await task.current;
      return saveNow();
    }
    const next = current.current;
    if (!active.current || !next || blocked.current) return false;
    if (!next.setupCompleted) {
      publish({ status: "draft", message: "Setup is saved in this browser until you finish it." });
      return false;
    }
    const snapshot = accountFarm(next);
    if (server.current.farm && sameData(snapshot, accountFarm(server.current.farm))) {
      if (!next.importText?.trim()) dropDraft();
      publish({ status: "saved", problems: [], message: "" });
      return true;
    }
    const savedSequence = sequence.current;
    publish({ status: "saving", message: "", problems: [] });
    task.current = (async () => {
      let succeeded = false;
      try {
        const response = await saveFarmChanges(profile.id, server.current, snapshot, {
          onSaved: (saved) => {
            if (!active.current) return;
            server.current = saved;
            // Checkpoint every acknowledged entity, including a partially completed save.
            persistDraft(current.current);
          },
          shouldContinue: () => active.current && !blocked.current && sequence.current === savedSequence,
        });
        if (!active.current) return false;
        succeeded = true;
        const newerEdits = sequence.current !== savedSequence;
        if (response.complete && !newerEdits) {
          // The server returns the stored numeric values. Keep any local import preview.
          current.current = { ...current.current, ...response.farm };
          publish({ farm: current.current });
        }
        if (!response.complete || newerEdits || current.current.importText?.trim()) persistDraft(current.current);
        else dropDraft();
        const complete = response.complete && !newerEdits;
        publish({
          status: complete ? "saved" : "draft",
          problems: complete ? [] : validateFarm(current.current),
          message: complete
            ? ""
            : "Some changes are still a browser draft. Complete the remaining fields to save them.",
        });
        return complete;
      } catch (error) {
        if (!active.current) return false;
        if (["VERSION_CONFLICT", "ACCOUNT_CHANGED"].includes(error.code)) blocked.current = true;
        publish({
          status:
            error.code === "VERSION_CONFLICT" ? "conflict" : error.code === "VALIDATION_ERROR" ? "draft" : "error",
          message: error.message,
          problems: error.errors || [],
        });
        return false;
      } finally {
        task.current = null;
        // A later keystroke must wait for the previous write and its returned version.
        if (succeeded && active.current && sequence.current !== savedSequence) schedule();
      }
    })();
    return task.current;
  }

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    async function load() {
      try {
        const remote = await getFarm(profile.id);
        if (cancelled) return;
        server.current = remote;
        const saved = readDraft(profile.id);
        raw.current = saved.raw;
        let next = saved.draft?.farm || remote.farm || createEmptyFarm();
        next = syncCropRecords({ ...next, importText: next.importText || "", importDraft: next.importDraft || null });
        const problems = next.setupCompleted ? validateFarm(next) : [];
        const matches =
          next.setupCompleted &&
          !problems.length &&
          remote.farm &&
          sameData(accountFarm(next), accountFarm(remote.farm));
        blocked.current = Boolean(
          saved.draft &&
          (saved.draft.baseVersion !== remote.version || (saved.draft.baseFarmId ?? null) !== remote.farmId) &&
          !matches,
        );
        current.current = next;
        setState({
          farm: next,
          loading: false,
          error: "",
          status: blocked.current ? "conflict" : matches ? "saved" : "draft",
          message: blocked.current
            ? "Newer data exists in your account. Your browser draft is kept; export it before loading the saved version."
            : "",
          problems,
          localError: "",
        });
        if (!blocked.current) {
          if (matches && !next.importText.trim() && saved.raw) dropDraft();
          else if (saved.draft) persistDraft(next);
          if (!matches && next.setupCompleted) schedule();
        }
      } catch (error) {
        if (!cancelled) setState((previous) => ({ ...previous, loading: false, error: error.message }));
      }
    }
    load();
    const refreshDate = () => setToday(todayISO());
    const dateTimer = setInterval(refreshDate, 60000);
    const changedElsewhere = (event) => {
      if (event.key === draftKey(profile.id) && event.newValue !== raw.current) {
        blocked.current = true;
        publish({
          status: "conflict",
          message: "The browser draft changed in another tab. Export your edits before reloading.",
        });
      }
    };
    const warn = (event) => {
      if (localFailed.current || task.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("focus", refreshDate);
    window.addEventListener("storage", changedElsewhere);
    window.addEventListener("beforeunload", warn);
    return () => {
      cancelled = true;
      active.current = false;
      clearTimeout(timer.current);
      clearInterval(dateTimer);
      window.removeEventListener("focus", refreshDate);
      window.removeEventListener("storage", changedElsewhere);
      window.removeEventListener("beforeunload", warn);
    };
    // profile is fixed for the lifetime of the keyed Workspace component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  useEffect(() => {
    saveLatest.current = saveNow;
  });

  function exportDraft() {
    const contents = current.current
      ? JSON.stringify(current.current, null, 2)
      : localStorage.getItem(draftKey(profile.id));
    const url = URL.createObjectURL(new Blob([contents || "{}"], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "feedboard-draft.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function discardDraft() {
    if (
      !window.confirm(
        "Discard this browser draft and load the version saved to your account? Export it first if needed.",
      )
    )
      return;
    if (task.current) await task.current;
    clearTimeout(timer.current);
    try {
      clearDraft(profile.id);
      window.location.reload();
    } catch {
      publish({ localError: "The browser draft could not be removed. Check this browser's storage permissions." });
    }
  }
  return {
    ...state,
    today,
    setFarm,
    saveNow,
    exportDraft,
    discardDraft,
    hasLocalError: () => localFailed.current,
    retry: () => window.location.reload(),
  };
}
