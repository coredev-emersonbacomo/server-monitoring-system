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

export interface InputProps extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "onChange"
> {
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

        // Keep internalValue in sync with external value updates
        useEffect(() => {
            if (
                passedValue !== undefined &&
                passedValue.toString() !== internalValue
            ) {
                setInternalValue(passedValue.toString());
            }
        }, [internalValue, passedValue]);

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
                    "relative group w-full cursor-text",
                    "h-12 peer text-base text-anti-primary rounded-md pt-0.5 px-4",
                    inputBg,
                    "outline rounded-md",
                    "flex items-center",
                    !errorLabel && !errorType && "outline-gray-400",
                    divClassName,
                    "focus-within:outline-1 focus-within:outline-gray-200",
                    errorType === "error" &&
                        "outline-red-500 focus-within:outline-red-600",
                    errorType === "warning" &&
                        "outline-orange-500 focus-within:outline-orange-600",
                    disableInput &&
                        "outline-gray-300 pointer-events-none cursor-not-allowed",
                    "hover:outline",
                )}
                onClick={() => {
                    inputRef.current?.focus();
                }}
            >
                {icon}
                {prefix && (
                    <span
                        className={twMerge(
                            "select-none pointer-events-none",
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
                            "relative flex-1 outline-none bg-transparent text-ellipsis",
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
                            "absolute text-md transition-all duration-200 pointer-events-none px-1",
                            inputBg,
                            icon ? "left-10" : "left-2",
                            "top-1/2 -translate-y-1/2 text-base text-gray-500",
                            errorLabel || errorType
                                ? errorType === "error"
                                    ? twMerge(
                                          "group-focus-within:text-red-600",
                                          internalValue && "text-red-600",
                                      )
                                    : twMerge(
                                          "group-focus-within:text-orange-600",
                                          internalValue && "text-orange-600",
                                      )
                                : "group-focus-within:text-gray-200",
                            "group-focus-within:top-0 group-focus-within:text-sm",
                            (internalValue || disableInput) && "top-0 text-sm",
                            disableInput && "text-gray-300",
                        )}
                    >
                        {label}
                        {sublabel && (
                            <span className="text-gray-400"> {sublabel}</span>
                        )}
                        {errorLabel && (
                            <span
                                className={
                                    errorType === "error"
                                        ? "text-red-500"
                                        : "text-orange-500"
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
