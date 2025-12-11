import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
