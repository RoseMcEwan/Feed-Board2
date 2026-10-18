import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import FormActions from "../../primaryUI/FormActions.jsx";
import Button from "../../primaryUI/buttons/Button.jsx";
import { InputField, SelectField } from "../../primaryUI/FormFields.jsx";
import { createId, displayNumber } from "../../../utilis/numbers.js";
import { isValidDate } from "../../../utilis/calendarDates.js";

export default function PaddockModal({
  group,
  farm,
  currentOrder,
  selectedDate,
  onClose,
  onSave,
  availablePaddocks = [],
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  const availableIds = new Set(availablePaddocks.map((paddock) => paddock.id));

  // Keep modal edits local until Save order is clicked.
  const [startDate, setStartDate] = useState(currentOrder?.startDate ?? selectedDate);

  const [rows, setRows] = useState(() =>
    (currentOrder?.paddockIds ?? [])
      .filter((id) => availableIds.has(id))
      .map((paddockId) => ({
        id: createId("queue-row"),
        paddockId,
      })),
  );

  const order = rows.map((row) => row.paddockId);

  const remainingPaddocks = availablePaddocks.filter((paddock) => !order.includes(paddock.id));

  function changeRow(index, paddockId) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              paddockId,
            }
          : row,
      ),
    );
  }

  function move(index, direction) {
    setRows((current) => {
      const next = [...current];
      const destination = index + direction;

      [next[index], next[destination]] = [next[destination], next[index]];

      return next;
    });
  }

  function saveOrder() {
    // No paddocks means this herd no longer has an active queue.
    if (!rows.length) {
      onSave(null);
      onClose();
      return;
    }

    if (!isValidDate(startDate)) {
      return;
    }

    onSave({
      startDate,
      paddockIds: order,
    });

    onClose();
  }

  useEffect(() => {
    const dialog = dialogRef.current;

    // Restore focus to the previous control when the dialog closes.
    const previous = document.activeElement;

    dialog.showModal();

    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="@container w-[calc(100vw-var(--spacing)*8)] max-w-dialog max-h-[calc(100dvh-var(--spacing)*12)] overflow-y-auto rounded-dialog border border-line bg-surface p-0 text-ink shadow-dialog backdrop:bg-overlay backdrop:backdrop-blur-xs"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== dialogRef.current) {
          return;
        }

        // Only close when the backdrop click falls outside the dialog box.
        const rect = dialogRef.current.getBoundingClientRect();

        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          onClose();
        }
      }}
    >
      <header className="flex items-start justify-between gap-4 border-b border-line p-4 sm:p-6">
        <div>
          <p className="mb-1.5 text-tiny font-bold tracking-widest text-brand uppercase">NEXT GRAZING BREAKS</p>

          <h2 id={titleId} className="mb-0">
            {group.name} · paddock order
          </h2>
        </div>

        <Button size="icon" aria-label="Close dialog" onClick={onClose}>
          <X aria-hidden="true" size={20} />
        </Button>
      </header>

      <div className="grid min-w-0 gap-5 p-4 sm:p-6">
        <InputField
          label="Queue starts on"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          required
        />

        <p className="mb-0 text-caption leading-relaxed text-muted">
          Tolerance: {displayNumber(farm.settings.paddockToleranceHa, 2)} ha, change in{" "}
          <Link to="/settings" onClick={onClose}>
            Farm settings
          </Link>
          .
        </p>

        <ol className="grid list-none gap-2.5">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <span className="w-6 text-center text-caption font-semibold text-faint">{index + 1}</span>

              <SelectField
                label={`Paddock position ${index + 1}`}
                labelHidden
                value={row.paddockId}
                options={availablePaddocks
                  .filter((paddock) => paddock.id === row.paddockId || !order.includes(paddock.id))
                  .map((paddock) => ({
                    value: paddock.id,
                    label: `${paddock.name} · ${displayNumber(paddock.hectares, 2)} ha`,
                  }))}
                onChange={(event) => changeRow(index, event.target.value)}
              />

              <div className="col-start-2 flex justify-self-end gap-1 sm:col-start-auto">
                <Button
                  size="icon"
                  aria-label={`Move paddock ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden="true" size={18} />
                </Button>

                <Button
                  size="icon"
                  aria-label={`Move paddock ${index + 1} down`}
                  disabled={index === rows.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden="true" size={18} />
                </Button>

                <Button
                  size="icon"
                  aria-label={`Remove paddock position ${index + 1}`}
                  onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                >
                  <X aria-hidden="true" size={18} />
                </Button>
              </div>
            </li>
          ))}
        </ol>

        <FormActions align="start">
          <Button
            disabled={!remainingPaddocks.length}
            onClick={() => {
              const paddock = remainingPaddocks[0];

              if (!paddock) {
                return;
              }

              setRows((current) => [
                ...current,
                {
                  id: createId("queue-row"),
                  paddockId: paddock.id,
                },
              ]);
            }}
          >
            <Plus aria-hidden="true" size={18} />
            Add paddock
          </Button>

          <Button
            disabled={!remainingPaddocks.length}
            onClick={() =>
              setRows((current) => [
                ...current,
                ...remainingPaddocks.map((paddock) => ({
                  id: createId("queue-row"),
                  paddockId: paddock.id,
                })),
              ])
            }
          >
            Add all remaining paddocks
          </Button>
        </FormActions>

        <FormActions>
          <Button variant="primary" disabled={rows.length > 0 && !isValidDate(startDate)} onClick={saveOrder}>
            Save order
          </Button>
        </FormActions>
      </div>
    </dialog>
  );
}
