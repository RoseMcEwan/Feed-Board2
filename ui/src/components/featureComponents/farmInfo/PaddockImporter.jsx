import DataTable, { TableHeader, TableCell } from "../../primaryUI/DataTable.jsx";
import FormActions from "../../primaryUI/FormActions.jsx";
import Card from "../../primaryUI/Card.jsx";
import { parsePaddockText } from "../../../utilis/parsePaddocks.js";
import { positive } from "../../../utilis/numbers.js";
import { InputField, TextareaField, SelectField } from "../../primaryUI/FormFields.jsx";
import Button from "../../primaryUI/buttons/Button.jsx";
import Notice from "../../primaryUI/Notice.jsx";

export default function PaddockImporter({ farm, onImport }) {
  const text = farm.importText || "";
  const result = farm.importDraft?.result ?? null;

  function setText(value) {
    onImport({
      ...farm,
      importText: value,
      importDraft: null,
    });
  }

  // Updating import preview
  function setResult(change) {
    const next = typeof change === "function" ? change(result) : change;

    onImport({
      ...farm,
      importDraft: {
        result: next,
      },
    });
  }

  // Check for duplicates
  const duplicates = new Set();
  const seen = new Set(farm.paddocks.map((paddock) => paddock.name.trim().toLowerCase()));

  result?.rows.forEach((row) => {
    const key = row.name.trim().toLowerCase();

    if (seen.has(key)) {
      duplicates.add(row.id);
    }

    seen.add(key);
  });

  const invalid = result?.rows.some((row) => !row.name.trim() || !positive(row.hectares) || duplicates.has(row.id));

  function changeRow(id, field, value) {
    setResult((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    }));
  }

  function read() {
    setResult(parsePaddockText(text, farm.herds));
  }

  function confirmImport() {
    if (!result?.rows.length || invalid) {
      return;
    }

    // New imported paddocks
    const paddocks = result.rows.map((row) => ({
      id: row.id,
      name: row.name.trim(),
      hectares: Number(row.hectares),
      herdId: row.herdId,
      excluded: false,
      exclusionReason: "",
      otherReason: "",
    }));

    onImport({
      ...farm,
      paddocks: [...farm.paddocks, ...paddocks],
      importText: "",
      importDraft: null,
    });
  }

  return (
    <Card variant="dashed" className="grid min-w-0 gap-5">
      <div>
        <p className="mb-1.5 text-tiny font-bold tracking-widest text-brand uppercase">PASTE, REVIEW, IMPORT</p>

        <h3 className="mt-1 mb-2.5 text-xl">Paste your paddocks</h3>

        <p className="mb-0 text-caption leading-relaxed text-muted">
          One paddock per line. Include paddock name and hectares, herd link is optional
        </p>
      </div>

      <TextareaField
        className="font-mono"
        wrapperClassName="[--field-control-size:var(--text-caption)]"
        label="Paddock text"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Name\tHectares\tHerd\np1\t8\t1\np2\t9.5\t1\np10\t11\t2"}
        maxLength={200000}
        spellCheck={false}
      />

      <FormActions align="start">
        <Button onClick={read} disabled={!text.trim()}>
          Read paddocks
        </Button>

        {Boolean(text.trim()) && (
          <Button
            variant="text"
            onClick={() => {
              if (!window.confirm("Discard this unimported text and preview?")) {
                return;
              }

              setText("");
            }}
          >
            Clear pasted text
          </Button>
        )}
      </FormActions>

      {result?.error && <Notice variant="error">{result.error}</Notice>}

      {Boolean(result?.rows.length) && (
        <>
          <Notice>Check each paddock name, hectare value and herd before importing.</Notice>

          <DataTable label="Import preview" caption="Recognised paddock names, hectares and herds" fixed>
            <thead>
              <tr>
                <TableHeader>Paddock Name</TableHeader>

                <TableHeader>Hectares</TableHeader>

                {farm.settings.assignHerds && <TableHeader>Herd</TableHeader>}
              </tr>
            </thead>

            <tbody>
              {result.rows.map((row, i) => (
                <tr key={row.id}>
                  <TableCell>
                    <InputField
                      label={`Imported name ${i + 1}`}
                      error={duplicates.has(row.id) ? "Duplicate name — rename." : undefined}
                      labelHidden
                      value={row.name}
                      onChange={(e) => changeRow(row.id, "name", e.target.value)}
                    />
                  </TableCell>

                  <TableCell>
                    <InputField
                      type="number"
                      label={`Imported hectares ${i + 1}`}
                      error={!positive(row.hectares) ? "Enter hectares." : undefined}
                      labelHidden
                      value={row.hectares}
                      onChange={(e) => changeRow(row.id, "hectares", e.target.value)}
                      min={0.001}
                      step="any"
                    />
                  </TableCell>

                  {farm.settings.assignHerds && (
                    <TableCell>
                      <SelectField
                        label={`Imported herd ${i + 1}`}
                        labelHidden
                        value={row.herdId}
                        onChange={(e) => changeRow(row.id, "herdId", e.target.value)}
                        options={[
                          { value: "", label: "Allocate in next step" },
                          ...farm.herds.map((herd) => ({
                            value: herd.id,
                            label: herd.name,
                          })),
                        ]}
                      />
                    </TableCell>
                  )}
                </tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}

      {Boolean(result?.rows.length) && (
        <Button variant="primary" className="justify-self-start" onClick={confirmImport} disabled={invalid}>
          Import {result.rows.length} paddocks
        </Button>
      )}
    </Card>
  );
}
