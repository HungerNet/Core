interface FooterSocial {
  label: string
  href: string
}

interface FooterProps {
  brand?: string
  socials?: FooterSocial[]
  footerNote?: string
}

export default function Footer({
  brand = "Site",
  socials = [],
  footerNote = "",
}: FooterProps) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <span className="footer-brand">
            <span className="gradient-text">{brand}</span>
          </span>

          <div className="footer-social">
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <p className="footer-copy">{footerNote}</p>
      </div>
    </footer>
  )
}
