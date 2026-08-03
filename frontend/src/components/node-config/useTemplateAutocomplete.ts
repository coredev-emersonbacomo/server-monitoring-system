import {
    useCallback,
    useState,
    type KeyboardEvent,
    type RefObject,
} from "react";
import {
    filterVariables,
    type TemplateVariable,
} from "./nodes/templateVariables";

export interface CaretCoords {
    top: number;
    left: number;
}

type TemplateField = HTMLInputElement | HTMLTextAreaElement;

function getCaretCoordinates(
    field: TemplateField,
    position: number,
): CaretCoords {
    const style = getComputedStyle(field);
    const div = document.createElement("div");
    const copyProps = [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "letterSpacing",
        "lineHeight",
        "textTransform",
        "textIndent",
        "wordSpacing",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
        "boxSizing",
    ] as const;
    for (const p of copyProps) {
        const v = style.getPropertyValue(p);
        if (v) div.style.setProperty(p, v);
    }
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.top = "0";
    div.style.left = "0";
    div.style.width = field instanceof HTMLInputElement ? "auto" : style.width;
    div.style.whiteSpace =
        field instanceof HTMLInputElement ? "pre" : "pre-wrap";
    div.style.wordBreak = "break-word";
    div.style.overflowWrap = "break-word";
    div.style.height = "auto";

    const span = document.createElement("span");
    span.textContent = "\u200b";
    div.appendChild(span);
    div.insertBefore(
        document.createTextNode(field.value.slice(0, position)),
        span,
    );
    document.body.appendChild(div);

    const rect = field.getBoundingClientRect();
    const left = span.offsetLeft + rect.left - field.scrollLeft;
    const top = span.offsetTop + span.offsetHeight + rect.top - field.scrollTop;
    document.body.removeChild(div);

    return { left, top };
}

export function useTemplateAutocomplete(
    value: string,
    onChange: (value: string) => void,
    fieldRef: RefObject<TemplateField>,
    onKeyDown?: (e: React.KeyboardEvent) => void,
) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [insertPos, setInsertPos] = useState(0);
    const [caret, setCaret] = useState<CaretCoords | null>(null);

    const filtered = filterVariables(query);
    const showDropdown = open && filtered.length > 0;

    const checkForTrigger = useCallback((field: TemplateField) => {
        const pos = field.selectionStart ?? 0;
        const textBefore = field.value.substring(0, pos);
        let lastOpen = textBefore.lastIndexOf("{");
        let isTag = false;

        if (lastOpen === -1) {
            lastOpen = textBefore.lastIndexOf("<");
            if (lastOpen === -1) {
                setOpen(false);
                return;
            }
            isTag = true;
        }

        const closeChar = isTag ? ">" : "}";
        const lastClose = textBefore.lastIndexOf(closeChar);
        if (lastClose > lastOpen) {
            setOpen(false);
            return;
        }
        const segment = textBefore.substring(lastOpen + 1);
        if (segment.includes(closeChar)) {
            setOpen(false);
            return;
        }
        setQuery((isTag ? "<" : "{") + segment);
        setInsertPos(lastOpen);
        setSelectedIndex(0);
        setCaret(getCaretCoordinates(field, lastOpen));
        setOpen(true);
    }, []);

    const close = useCallback(() => {
        setOpen(false);
    }, []);

    const insertVariable = useCallback(
        (variable: TemplateVariable) => {
            const field = fieldRef.current;
            if (!field) return;
            const before = value.substring(0, insertPos);
            const after = field.value.substring(
                field.selectionStart ?? value.length,
            );
            let newVal: string;
            let cursorOffset: number;
            if ((variable.group as string) === "tag") {
                const tagKey: string = variable.key;
                const closing = tagKey.startsWith("</")
                    ? ""
                    : `</${tagKey.slice(1)}`;
                const tagContent =
                    tagKey === "<discord-button>"
                        ? '<discord-button detailsUrl=""></discord-button>'
                        : tagKey === "<email-button>"
                          ? '<email-button url=""></email-button>'
                          : tagKey + closing;
                newVal = before + tagContent + after;
                cursorOffset =
                    tagKey === "<discord-button>"
                        ? insertPos + '<discord-button detailsUrl="'.length
                        : tagKey === "<email-button>"
                          ? insertPos + '<email-button url="'.length
                          : insertPos + tagKey.length;
            } else {
                newVal = before + "{" + variable.key + "}" + after;
                cursorOffset = insertPos + variable.key.length + 2;
            }
            onChange(newVal);
            close();
            requestAnimationFrame(() => {
                field.focus();
                field.setSelectionRange(cursorOffset, cursorOffset);
            });
        },
        [value, insertPos, onChange, close, fieldRef],
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<TemplateField>) => {
            checkForTrigger(e.target);
        },
        [checkForTrigger],
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<TemplateField>) => {
            if (showDropdown) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex((i) => (i + 1) % filtered.length);
                    return;
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex(
                        (i) => (i - 1 + filtered.length) % filtered.length,
                    );
                    return;
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    insertVariable(filtered[selectedIndex]);
                    return;
                }
                if (e.key === "Escape") {
                    e.preventDefault();
                    close();
                    return;
                }
            }
            onKeyDown?.(e);
        },
        [
            showDropdown,
            filtered,
            selectedIndex,
            insertVariable,
            onKeyDown,
            close,
        ],
    );

    const handleFocus = useCallback(
        (field: TemplateField) => {
            checkForTrigger(field);
        },
        [checkForTrigger],
    );

    const handleClick = useCallback(
        (field: TemplateField) => {
            checkForTrigger(field);
        },
        [checkForTrigger],
    );

    return {
        showDropdown,
        filtered,
        selectedIndex,
        query,
        caret,
        handleChange,
        handleKeyDown,
        handleFocus,
        handleClick,
        insertVariable,
        setSelectedIndex,
        close,
    };
}
