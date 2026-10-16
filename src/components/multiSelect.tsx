import {
    ButtonItem,
    ConfirmModal,
    DialogCheckbox,
    showModal,
} from "@decky/ui";
import { FC, ReactNode, useState } from "react";

export interface MultiSelectOption {
    label: ReactNode;
    icon: ReactNode;
    value: number;
}

interface MultiSelectProps {
    label: string;
    description?: ReactNode;
    hint?: ReactNode;
    value: number;
    options: MultiSelectOption[];
    onChange: (value: number) => void;
    disabled?: boolean;
    doNotApplyLabel?: string;
    doNotApplyValue?: number;
    minimumSelected?: number;
}

interface MultiSelectModalProps {
    title: ReactNode;
    value: number;
    options: MultiSelectOption[];
    onChange: (value: number) => void;
    hint?: ReactNode;
    doNotApplyValue: number;
    minimumSelected: number;
    closeModal?: () => void;
}

const MultiSelectModal: FC<MultiSelectModalProps> = ({
    title,
    value,
    options,
    onChange,
    hint,
    doNotApplyValue,
    minimumSelected,
    closeModal,
}) => {
    const availableValues = options.reduce((result, option) => result | option.value, 0);
    const [draftValue, setDraftValue] = useState(value === doNotApplyValue ? 0 : value & availableValues);
    const selectedCount = options.filter((option) => (draftValue & option.value) !== 0).length;
    const isValid = selectedCount === 0 || selectedCount >= minimumSelected;

    const toggleOption = (option: MultiSelectOption, checked: boolean) => {
        setDraftValue((currentValue) => {
            return checked
                ? currentValue | option.value
                : currentValue & ~option.value;
        });
    };

    return (
        <ConfirmModal
            strTitle={title}
            bOKDisabled={!isValid}
            onCancel={closeModal}
            onOK={() => {
                onChange(draftValue === 0 ? doNotApplyValue : draftValue);
                closeModal?.();
            }}
        >
            {hint != null && (
                <div style={{ marginBottom: "12px", opacity: 0.7 }}>
                    {hint}
                </div>
            )}

            {options.map((option) => (
                <DialogCheckbox
                    key={option.value}
                    controlled
                    checked={(draftValue & option.value) !== 0}
                    label={
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {option.icon}
                            <span>{option.label}</span>
                        </div>
                    }
                    onChange={(checked) => toggleOption(option, checked)}
                />
            ))}
        </ConfirmModal>
    );
};

export const MultiSelect: FC<MultiSelectProps> = ({
    label,
    description,
    hint,
    value,
    options,
    onChange,
    disabled = false,
    doNotApplyLabel = "Do not apply",
    doNotApplyValue = -1,
    minimumSelected = 2,
}) => {
    const selectedOptions = value === doNotApplyValue
        ? []
        : options.filter((option) => (value & option.value) !== 0);

    const buttonValue = selectedOptions.length === 0
        ? doNotApplyLabel
        : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {selectedOptions.map((option) => (
                    <span key={option.value} style={{ display: "flex" }}>
                        {option.icon}
                    </span>
                ))}
            </div>
        );

    return (
        <ButtonItem
            layout="below"
            label={label}
            description={description}
            disabled={disabled}
            onClick={() => showModal(
                <MultiSelectModal
                    title={label}
                    value={value}
                    options={options}
                    onChange={onChange}
                    hint={hint}
                    doNotApplyValue={doNotApplyValue}
                    minimumSelected={minimumSelected}
                />,
                window,
                { strTitle: label }
            )}
        >
            {buttonValue}
        </ButtonItem>
    );
};
