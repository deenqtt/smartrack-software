"use client";

import React, { createContext, useContext } from "react";

interface RuleChainContextType {
  deleteNode: (nodeId: string) => void;
  onEditNode: (nodeId: string) => void;
}

const RuleChainContext = createContext<RuleChainContextType | undefined>(
  undefined
);

export const RuleChainProvider = ({
  children,
  deleteNode,
  onEditNode,
}: {
  children: React.ReactNode;
  deleteNode: (nodeId: string) => void;
  onEditNode: (nodeId: string) => void;
}) => {
  return (
    <RuleChainContext.Provider value={{ deleteNode, onEditNode }}>
      {children}
    </RuleChainContext.Provider>
  );
};

export const useRuleChain = () => {
  const context = useContext(RuleChainContext);
  if (!context) {
    throw new Error("useRuleChain must be used within RuleChainProvider");
  }
  return context;
};
