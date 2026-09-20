import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-10 text-center">
      <h1 className="text-2xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">This address is not part of the portal. Return to the dashboard or use search to find a flow.</p>
      <Link to="/" className="btn-primary mt-6">Go to dashboard</Link>
    </div>
  );
}
