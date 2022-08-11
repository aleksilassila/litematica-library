import theme from "../../constants/theme";
import PrimaryButton from "./button/Button";
import { ReactNode } from "react";

const Root = ({ children }) => {
  return (
    <div
      className={`${theme.ui.borders} ${theme.ui.outline} overflow-hidden w-max flex items-stretch h-10 bg-white font-medium divide-x divide-stone-300`}
    >
      {children}
    </div>
  );
};

const Item = ({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  [p: string]: any;
}) => (
  // <div className="px-4 py-0 max-h-full flex items-center w-max">{children}</div>
  <PrimaryButton
    style={{ borderRadius: 0 }}
    className={"border-0 " + className}
    {...rest}
  >
    {children}
  </PrimaryButton>
);

export { Root, Item as Button };
