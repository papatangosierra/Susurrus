import React from "react";

interface ResetButtonProps {
  onReset: () => void;
  disabled?: boolean;
}

const ResetButton: React.FC<ResetButtonProps> = ({
  onReset,
  disabled = false,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onReset();
    }
  };

  return (
      <button className="reset-button" onClick={handleClick} disabled={disabled}>
      Reset
    </button>
  );
};

export default ResetButton;
