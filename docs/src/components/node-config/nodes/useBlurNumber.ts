import { useState, useCallback, type ChangeEvent, type FocusEvent } from 'react';

export function useBlurNumber(
    initialValue: number,
    onCommit: (value: number) => void,
) {
    const [text, setText] = useState(String(initialValue));

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value);
    }, []);

    const handleBlur = useCallback((e: FocusEvent<HTMLInputElement>) => {
        const parsed = parseFloat(e.target.value);
        const valid = !isNaN(parsed) ? parsed : 0;
        setText(String(valid));
        onCommit(valid);
    }, [onCommit]);

    return { value: text, onChange: handleChange, onBlur: handleBlur };
}
