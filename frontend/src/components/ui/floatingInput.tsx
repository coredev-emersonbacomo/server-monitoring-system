import React, {
    type InputHTMLAttributes,
    forwardRef,
    useRef,
    useEffect,
    useImperativeHandle,
    useState,
} from "react";
import { twMerge } from "tailwind-merge";
import { toLabelCase } from "@/utils/helpers";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: React.ReactNode;
    sublabel?: string;
    showLabel?: boolean;
    icon?: React.ReactNode;
    debounceMs?: number;
    onValueChangeDebounce?: (value: string) => void;
    disableInput?: boolean;
    divClassName?: string;
    inputBg?: string;
    autoValidate?: boolean;
    onValueChange?: (value: string, name: string) => void;
}

export interface InputRef {
    setError: (type: "error" | "warning", message?: string) => void;
    clearError: () => void;
    div: HTMLDivElement | null;
    input: HTMLInputElement | null;
    focus: () => void;
}

export const FloatingInput = forwardRef<InputRef, InputProps>(
    (
        {
            children,
            label,
            sublabel,
            showLabel = true,
            icon,
            className,
            onValueChange,
            onValueChangeDebounce,
            debounceMs = 300,
            divClassName,
            disableInput,
            defaultValue,
            autoValidate,
            prefix = "",
            inputBg = "bg-card",
            value: passedValue,
            ...props
        },
        ref,
    ) => {
        const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const inputRef = useRef<HTMLInputElement>(null);
        const divRef = useRef<HTMLDivElement>(null);

        const [errorLabel, setErrorLabel] = useState<string>();
        const [errorType, setErrorType] = useState<"error" | "warning">();
        const [internalValue, setInternalValue] = useState(
            (passedValue ?? defaultValue)?.toString() || "",
        );

        // Keep internalValue in sync with external value updates when passedValue changes externally
        useEffect(() => {
            if (passedValue !== undefined) {
                setInternalValue(passedValue.toString());
            }
        }, [passedValue]);

        label ??= toLabelCase(props.name ?? "");

        const handleChange: React.ChangeEventHandler<HTMLInputElement> = (
            e,
        ) => {
            if (disableInput) return;

            const newValue = e.target.value;

            setInternalValue(newValue);

            setErrorLabel(undefined);
            setErrorType(undefined);
            onValueChange?.(newValue, props.name ?? "");
            props.onChange?.(e);

            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            if (newValue === "") {
                onValueChangeDebounce?.("");
                return;
            }

            if (onValueChangeDebounce) {
                timeoutRef.current = setTimeout(() => {
                    onValueChangeDebounce(newValue);
                }, debounceMs);
            }
        };

        useImperativeHandle(ref, () => ({
            setError: (type: "error" | "warning" = "error", msg?: string) => {
                setErrorType(type);
                setErrorLabel(msg ?? "");
            },
            clearError: () => setErrorLabel(undefined),
            focus: () => inputRef.current?.focus(),
            div: divRef.current,
            input: inputRef.current,
        }));

        useEffect(() => {
            return () => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
            };
        }, []);

        return (
            <div
                ref={divRef}
                className={twMerge(
                    "relative group w-full cursor-text transition-colors",
                    "h-12 text-base text-foreground rounded-md pt-0.5 px-4",
                    inputBg,
                    "border border-input rounded-md",
                    "flex items-center shadow-sm",
                    divClassName,
                    "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
                    errorType === "error" &&
                        "border-destructive focus-within:border-destructive focus-within:ring-destructive",
                    errorType === "warning" &&
                        "border-amber-500 focus-within:border-amber-500 focus-within:ring-amber-500",
                    disableInput &&
                        "opacity-50 pointer-events-none cursor-not-allowed",
                )}
                onClick={() => {
                    inputRef.current?.focus();
                }}
            >
                {icon}
                {prefix && (
                    <span
                        className={twMerge(
                            "select-none pointer-events-none text-muted-foreground",
                            icon && "ml-2",
                        )}
                    >
                        {prefix}
                    </span>
                )}

                {/* Wrapper to perfectly align highlighted text and input */}
                <div className={"relative flex-1 h-full flex items-center"}>
                    <input
                        {...props}
                        ref={inputRef}
                        placeholder=" "
                        onChange={handleChange}
                        value={internalValue}
                        className={twMerge(
                            "relative flex-1 outline-none bg-transparent text-ellipsis text-foreground placeholder:text-muted-foreground/50",
                            className,
                            icon && "ml-2",
                        )}
                        title={
                            props.type !== "password"
                                ? [internalValue, props.title]
                                      .filter(Boolean)
                                      .join(" ")
                                : ""
                        }
                        onBlur={(e) => {
                            if (autoValidate)
                                inputRef.current?.reportValidity();
                            props.onBlur?.(e);
                        }}
                    />
                </div>

                {children}

                {showLabel && label && (
                    <label
                        className={twMerge(
                            "absolute text-md transition-all duration-200 pointer-events-none px-1 rounded-sm",
                            inputBg,
                            icon ? "left-10" : "left-2",
                            "top-1/2 -translate-y-1/2 text-base text-muted-foreground",
                            errorLabel || errorType
                                ? errorType === "error"
                                    ? twMerge(
                                          "group-focus-within:text-destructive",
                                          internalValue && "text-destructive",
                                      )
                                    : twMerge(
                                          "group-focus-within:text-amber-500",
                                          internalValue && "text-amber-500",
                                      )
                                : "group-focus-within:text-foreground",
                            "group-focus-within:top-0 group-focus-within:text-xs group-focus-within:font-medium",
                            (internalValue || disableInput) && "top-0 text-xs font-medium",
                            disableInput && "text-muted-foreground/50",
                        )}
                    >
                        {label}
                        {sublabel && (
                            <span className="text-muted-foreground/70"> {sublabel}</span>
                        )}
                        {errorLabel && (
                            <span
                                className={
                                    errorType === "error"
                                        ? "text-destructive"
                                        : "text-amber-500"
                                }
                            >
                                {" "}
                                ({errorLabel})
                            </span>
                        )}
                    </label>
                )}
            </div>
        );
    },
);

FloatingInput.displayName = "FloatingInput";
