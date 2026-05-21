"use client";

import React from "react";

// Tabla compacta, scrollable y con estilos Coforma Institucional
export const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full border border-slate-300 text-sm">{children}</table>
  </div>
);

// Select desplegable estilizado
export const Select: React.FC<{
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
}> = ({ value, onValueChange, children }) => (
  <select
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    className="border rounded px-2 py-1 bg-white text-sm"
  >
    {children}
  </select>
);

// Badge con variantes de estilo
export const Badge: React.FC<{ variant?: "primary" | "secondary"; children: React.ReactNode }> =
  ({ variant = "primary", children }) => (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${
        variant === "primary" ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-800"
      }`}
    >
      {children}
    </span>
  );

// Botón estilizado
export const Button: React.FC<{ onClick?: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <button
    className="px-3 py-1 rounded bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:bg-gray-300"
    onClick={onClick}
  >
    {children}
  </button>
);

// Spinner animado
export const Spinner: React.FC = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
);