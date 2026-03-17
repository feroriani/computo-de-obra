import { HashRouter, Routes, Route } from "react-router-dom";
import { ComputosList } from "../features/computos/pages/ComputosList";
import { ComputoEditor } from "../features/computos/pages/ComputoEditor";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ComputosList />} />
        <Route path="/computo/:versionId" element={<ComputoEditor />} />
      </Routes>
    </HashRouter>
  );
}
