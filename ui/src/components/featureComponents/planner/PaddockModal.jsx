import { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import FormActions from "../../primaryUI/FormActions.jsx";
import Button from "../../primaryUI/buttons/Button.jsx";
import { InputField, SelectField } from "../../primaryUI/FormFields.jsx";
import { availableQueuePaddocks } from "../../../utilis/farmSelectors.js";
import { displayNumber } from "../../../utilis/numbers.js";

export default function PaddockModal({ group, farm, currentOrder, selectedDate, onClose, onSave }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  const availablePaddocks = availableQueuePaddocks(farm, group.id);
  const availableIds = new Set(availablePaddocks.map((paddock) => paddock.id));
  const savedOrder = currentOrder?.paddockIds ?? [];

  // Remove paddocks that are no longer available to this herd from older saved queues.
  const order = savedOrder.filter((id) => id === "" || availableIds.has(id));

  const remainingPaddocks = availablePaddocks.filter((paddock) => !order.includes(paddock.id));

  const startDate = currentOrder?.startDate ?? selectedDate;

  function changeOrder(change) {
    onSave({
      startDate,
      paddockIds: order,
      ...change,
    });
  }

  function move(index, direction) {
    const next = [...order];
    const destination = index + direction;

    [next[index], next[destination]] = [next[destination], next[index]];

    changeOrder({ paddockIds: next });
  }

  // Save any unavailable paddocks that were automatically removed from an old queue.
  function closeAndSave() {
    if (order.length !== savedOrder.length) {
      changeOrder({ paddockIds: order });
    }

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
        closeAndSave();
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
          closeAndSave();
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

        <Button size="icon" aria-label="Close dialog" onClick={closeAndSave}>
          <X aria-hidden="true" size={20} />
        </Button>
      </header>

      <div className="grid min-w-0 gap-5 p-4 sm:p-6">
        <InputField
          label="Queue starts on"
          type="date"
          value={startDate}
          onChange={(event) => changeOrder({ startDate: event.target.value })}
          required
        />

        <p className="mb-0 text-caption leading-relaxed text-muted">
          Tolerance: {displayNumber(farm.settings.paddockToleranceHa, 2)} ha, change in{" "}
          <Link to="/settings" onClick={closeAndSave}>
            Farm settings
          </Link>
          .
        </p>

        <ol className="grid list-none gap-2.5">
          {order.map((id, index) => (
            <li
              key={`${index}-${id}`}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <span className="w-6 text-center text-caption font-semibold text-faint">{index + 1}</span>

              <SelectField
                label={`Paddock position ${index + 1}`}
                labelHidden
                value={id}
                options={[
                  { value: "", label: "Choose paddock" },
                  ...availablePaddocks
                    .filter((paddock) => paddock.id === id || !order.includes(paddock.id))
                    .map((paddock) => ({
                      value: paddock.id,
                      label: `${paddock.name} · ${displayNumber(paddock.hectares, 2)} ha`,
                    })),
                ]}
                onChange={(event) =>
                  changeOrder({
                    paddockIds: order.map((value, i) => (i === index ? event.target.value : value)),
                  })
                }
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
                  disabled={index === order.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden="true" size={18} />
                </Button>

                <Button
                  size="icon"
                  aria-label={`Remove paddock position ${index + 1}`}
                  onClick={() =>
                    changeOrder({
                      paddockIds: order.filter((_, i) => i !== index),
                    })
                  }
                >
                  <X aria-hidden="true" size={18} />
                </Button>
              </div>
            </li>
          ))}
        </ol>

        <FormActions align="start">
          <Button
            disabled={order.length >= availablePaddocks.length}
            onClick={() =>
              changeOrder({
                paddockIds: [...order, ""],
              })
            }
          >
            <Plus aria-hidden="true" size={18} />
            Add paddock
          </Button>

          <Button
            disabled={!remainingPaddocks.length}
            onClick={() =>
              changeOrder({
                paddockIds: [...order.filter(Boolean), ...remainingPaddocks.map((paddock) => paddock.id)],
              })
            }
          >
            Add all remaining paddocks
          </Button>
        </FormActions>

        <FormActions>
          <Button variant="primary" onClick={closeAndSave}>
            Done
          </Button>
        </FormActions>
      </div>
    </dialog>
  );
}
