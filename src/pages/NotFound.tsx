import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 : tentative d'accès à une route inexistante :", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Page introuvable</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
