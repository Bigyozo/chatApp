import React from "react";

const Navibar: React.FC = () => {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.5rem 1rem",
        backgroundColor: "#2d3748",
        color: "#fff",
      }}
    >
      <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>ChatApp</div>
      <ul
        style={{
          display: "flex",
          listStyle: "none",
          margin: 0,
          padding: 0,
          gap: "1rem",
        }}
      >
        <li>首页</li>
        <li>关于</li>
      </ul>
    </nav>
  );
};

export default Navibar;
