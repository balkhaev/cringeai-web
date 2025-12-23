"use client";

import { useCallback, useState } from "react";
import {
  ElementRemixSelector,
  type ElementSelection,
} from "@/components/element-remix-selector";
import type { TemplateAnalysis } from "@/lib/templates-api";

export type { ElementSelection } from "@/components/element-remix-selector";

type RemixEditorProps = {
  analysis: TemplateAnalysis;
  onSelectionsChange: (selections: ElementSelection[]) => void;
  disabled?: boolean;
};

/**
 * RemixEditor - Component for selecting element replacements
 * Simplified to focus only on context-aware element remix
 */
export function RemixEditor({
  analysis,
  onSelectionsChange,
  disabled = false,
}: RemixEditorProps) {
  const [_elementSelections, setElementSelections] = useState<
    ElementSelection[]
  >([]);

  const handleElementSelectionChange = useCallback(
    (selections: ElementSelection[]) => {
      setElementSelections(selections);
      onSelectionsChange(selections);
    },
    [onSelectionsChange]
  );

  const hasElements = analysis.elements && analysis.elements.length > 0;

  if (!hasElements) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Элементы для ремикса не найдены
        </p>
      </div>
    );
  }

  return (
    <ElementRemixSelector
      disabled={disabled}
      elements={analysis.elements!}
      onSelectionChange={handleElementSelectionChange}
    />
  );
}
