// Form system — assemble a `Form` namespace for clean imports:
//   import { Form } from "@/components/ui/form";
//   <Form.Root>  <Form.Button>  <Form.Buttons.Submit>  etc.
//
// Create a store with:
//   const store = useMemo(() => createFormStore({ schema, originalData, initialMode }), []);
//
// Read store externally:
//   const mode = useForm(store, s => s.mode);

import { createFormStore, useForm, type FormStore, type FormState } from "./createFormStore";
import { useFormStoreForComponents } from "./useFormStoreForComponents";
import { FormRoot, type FormRootProps } from "./FormRoot";
import {
    ValidationHandler,
    type ValidationHandlerProps,
} from "./FormHandlers";
import { SubmitHandler, type SubmitHandlerProps } from "./FormHandlers";
import { DeleteHandler, type DeleteHandlerProps } from "./FormHandlers";
import {
    FormButton,
    type FormButtonProps,
    FormCancel,
    type FormCancelProps,
    FormEdit,
    type FormEditProps,
    FormSubmit,
    FormDelete,
    type FormDeleteProps,
    FormDeleteModal,
    type FormDeleteModalProps,
} from "./FormButtons";

export {
    createFormStore,
    useForm,
    useFormStoreForComponents,
    FormRoot,
    FormButton,
    FormCancel,
    FormEdit,
    FormSubmit,
    FormDelete,
    FormDeleteModal,
    ValidationHandler,
    SubmitHandler,
    DeleteHandler,
};

export type {
    FormRootProps,
    FormButtonProps,
    FormCancelProps,
    FormEditProps,
    FormDeleteProps,
    FormDeleteModalProps,
    ValidationHandlerProps,
    SubmitHandlerProps,
    DeleteHandlerProps,
};

export const Form = {
    Root: FormRoot,
    Button: FormButton,
    Buttons: {
        Cancel: FormCancel,
        Edit: FormEdit,
        Submit: FormSubmit,
        Delete: FormDelete,
    },
    DeleteModal: FormDeleteModal,
    ValidationHandler,
    SubmitHandler,
    DeleteHandler,
} as const;

export type { FormStore, FormState };
