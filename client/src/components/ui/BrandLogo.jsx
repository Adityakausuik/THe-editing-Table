import logo from "../../assets/the-editing-table-logo.png";

export default function BrandLogo({ className = "", imageClassName = "" }) {
  return (
    <img
      src={logo}
      alt="The Editing Table"
      className={`h-9 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105 ${imageClassName} ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}
