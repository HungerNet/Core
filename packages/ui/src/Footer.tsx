import { Icon, type IconName } from "./Icon";

export interface FooterSocialLink {
  label: string;
  href: string;
  icon?: IconName;
}

export interface FooterProps {
  brand: string;
  socials: FooterSocialLink[];
  footerNote: string;
}

export function Footer({ brand, socials, footerNote }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span className="footer-brand"><span className="gradient-text">{brand}</span></span>
        <nav className="footer-social" aria-label={`${brand} social links`}>
          {socials.map((social) => (
            <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer">
              <Icon name={social.icon ?? "external"} size={15} />
              <span>{social.label}</span>
            </a>
          ))}
        </nav>
      </div>
      <p className="footer-copy">{footerNote}</p>
    </footer>
  );
}