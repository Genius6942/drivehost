import { FC } from "react";
import { ButtonHTMLAttributes, DetailedHTMLProps } from "react";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  contained?: boolean;
}
const Button: FC<ButtonProps> = function ({
  children,
  className,
  contained = false,
  ...props
}) {
  return (
    <button
      {...props}
      className={
        contained
          ? "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          : "bg-transparent hover:bg-blue-100 text-blue-700 font-semibold py-2 px-4 border border-transparent rounded" +
            " " +
            (className || "")
      }
      type="button"
    >
      {children}
    </button>
  );
};

export default Button;
