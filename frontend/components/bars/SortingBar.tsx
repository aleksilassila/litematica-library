const SortingBar = ({ children }) => {
  return (
    <div className="sorting-bar">
      {children}
      <style jsx>
        {`
          .sorting-bar {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .space {
            margin-right: 0.5em;
          }

          :global(.left > *:not(:last-child)) {
            margin-right: 0.5em;
          }
        `}
      </style>
    </div>
  );
};

const SortingBarLeft = ({ children }) => {
  return (
    <div
      className="left"
      style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
    >
      {children}
    </div>
  );
};

const SortingBarRight = ({ children }) => {
  return (
    <div
      className="right"
      style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
    >
      {children}
    </div>
  );
};

export { SortingBar, SortingBarLeft, SortingBarRight };
