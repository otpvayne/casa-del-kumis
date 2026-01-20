import BancoUpload from "../components/BancoUpload";
import BancoTable from "../components/BancoTable";

export default function BancoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Banco</h1>

      <BancoUpload />
      <BancoTable />
    </div>
  );
}
