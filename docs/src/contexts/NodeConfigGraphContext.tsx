import { createContext, useContext } from "react";

type NodeConfigGraphContextType = {
    isPreview: boolean;
};

const NodeConfigGraphContext = createContext<NodeConfigGraphContextType>({
    isPreview: false,
});

export function NodeConfigGraphProvider({
    isPreview,
    children,
}: {
    isPreview: boolean;
    children: React.ReactNode;
}) {
    return (
        <NodeConfigGraphContext.Provider value={{ isPreview }}>
            {children}
        </NodeConfigGraphContext.Provider>
    );
}

export function useNodeConfigGraph() {
    return useContext(NodeConfigGraphContext);
}
