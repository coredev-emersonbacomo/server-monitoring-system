import { MapPin, Mail, Phone, Landmark } from "lucide-react";
import { Form, useForm, type FormStore } from "@/components/ui/form";
import { FloatingInput } from "@/components/ui/floatingInput";
import Field from "../components/Field";
import SectionHeader from "../components/SectionHeader";
import { formatContactNumber, validateContactNumber } from "../utils/client-helper";
import { formatCurrency } from "@/utils/helpers";
import type { ClientData } from "@/types/models";
import type { ClientForm } from "../constants/schema";

interface ClientDetailsTabProps {
    store: FormStore<ClientForm>;
    isCreate: boolean;
    client?: ClientData;
    onSubmit: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    formatValue: (v: string) => string;
    handleChange: (v: string, pos: number, cb: (u: string) => void) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}

export function ClientDetailsTab({
    store,
    isCreate,
    client,
    onSubmit,
    inputRef,
    formatValue,
    handleChange,
    handleKeyDown,
    handlePaste,
}: ClientDetailsTabProps) {
    const form = useForm(store, (s) => s.form);
    const errors = useForm(store, (s) => s.errors);
    const mode = useForm(store, (s) => s.mode);
    const showEdit = mode !== "view";

    return (
        <Form.Root
            store={store}
            id="client-detail-form"
            className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-8"
        >
            <Form.SubmitHandler handler={onSubmit} />
            <section className="space-y-4">
                <SectionHeader title="Basic Information" description="Core details about this client account." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {showEdit ? (
                        <FloatingInput
                            label="Location"
                            value={form.location}
                            onValueChange={store.set("location")}
                            error={errors.location}
                        />
                    ) : (
                        <Field label="Location" icon={MapPin} required isEdit={showEdit}>
                            <p className="text-base font-semibold text-foreground py-1">{client?.location}</p>
                        </Field>
                    )}
                </div>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-4">
                <SectionHeader title="Contact Details" description="How to reach this client." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {showEdit ? (
                        <FloatingInput
                            type="email"
                            label="Email Address"
                            value={form.email}
                            onValueChange={store.set("email")}
                            error={errors.email}
                        />
                    ) : (
                        <Field label="Email Address" icon={Mail} required isEdit={showEdit}>
                            <p className="text-base font-semibold text-foreground ">{client?.email}</p>
                        </Field>
                    )}

                    {showEdit ? (
                        <FloatingInput
                            label="Contact Number"
                            value={form.contact_number}
                            maxLength={11}
                            inputMode="numeric"
                            onValueChange={(value: string) => {
                                const digits = value.replace(/\D/g, "").slice(0, 11);
                                store.set("contact_number")(digits);
                                if (!digits) {
                                    store.setState({
                                        errors: {
                                            ...errors,
                                            contact_number: "Contact number is required",
                                        },
                                    });
                                } else if (digits.length === 11) {
                                    const message = validateContactNumber(digits);
                                    store.setState({
                                        errors: {
                                            ...errors,
                                            contact_number: message ?? "",
                                        },
                                    });
                                } else if (!digits.startsWith("09") && (digits.length === 7 || digits.length === 8)) {
                                    const message = validateContactNumber(digits);
                                    store.setState({
                                        errors: {
                                            ...errors,
                                            contact_number: message ?? "",
                                        },
                                    });
                                } else if (errors.contact_number) {
                                    store.setState({
                                        errors: {
                                            ...errors,
                                            contact_number: "",
                                        },
                                    });
                                }
                            }}
                            onBlur={() => {
                                const message = validateContactNumber(form.contact_number);
                                store.setState({
                                    errors: {
                                        ...errors,
                                        contact_number: message ?? "",
                                    },
                                });
                            }}
                            error={errors.contact_number}
                        />
                    ) : (
                        <Field label="Contact Number" icon={Phone} required isEdit={showEdit}>
                            <p className="text-base font-semibold text-foreground">
                                {formatContactNumber(client?.contact_number) || ""}
                            </p>
                        </Field>
                    )}
                </div>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-4">
                <SectionHeader
                    title="Financial & Subscription"
                    description="Budget limit and combined server subscription fees."
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {showEdit ? (
                        <FloatingInput
                            type="text"
                            inputMode="decimal"
                            label="Monthly Budget (₱)"
                            value={formatValue(String(form.budget ?? 0))}
                            onValueChange={(val: string) => {
                                const el = inputRef.current;
                                const cursorPos = el?.selectionStart ?? val.length;
                                handleChange(val, cursorPos, (unformatted: string) => {
                                    store.set("budget")(unformatted);
                                });
                            }}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            error={errors.budget}
                        />
                    ) : (
                        <Field label="Monthly Budget" icon={Landmark} isEdit={showEdit}>
                            <p className="text-base font-semibold text-foreground">
                                {formatCurrency(client?.budget, { suffix: " / mo" })}
                            </p>
                        </Field>
                    )}

                    {!isCreate && (
                        <Field label="Total Server Subscription Fee" icon={Landmark} isEdit={false}>
                            <p className="text-base font-semibold text-foreground">
                                {formatCurrency(client?.total_subscription_fee, { suffix: " / mo" })}
                            </p>
                        </Field>
                    )}
                </div>
            </section>
        </Form.Root>
    );
}
