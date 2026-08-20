import Button from "../components/ui/Button.jsx";
import Container from "../components/ui/Container.jsx";

export default function NotFoundPage() {
  return (
    <div className="min-h-svh flex items-center justify-center pt-28 pb-16 text-center">
      <Container className="max-w-xl space-y-6">
        <span className="font-serif text-8xl font-normal text-site">404</span>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-forest">
          Page Not Found
        </h1>
        <p className="text-sage-muted text-lg">
          The editorial page or project details you are looking for could not be found.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button href="/" variant="primary">
            Return to Homepage
          </Button>
          <Button href="/services" variant="secondary">
            Explore Services
          </Button>
        </div>
      </Container>
    </div>
  );
}
