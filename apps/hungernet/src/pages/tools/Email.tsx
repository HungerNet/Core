import { useEffect, useState } from "react";
import {
  CopyField,
  GlassCard,
  GlassButton,
  InputBox,
  FaqAccordion,
  Icon,
  usePageTitle,
} from "@hungernet/ui/components";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function EmailGuide() {
  usePageTitle("HungerNet | Email Setup");
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // Fields
  const [email, setEmail] = useState(params.get("email") || "");
  const [name, setName] = useState(params.get("name") || "");
  const [password, setPassword] = useState(params.get("password") || "");
  const provider = params.get("provider") || "cloudflare";

  

  // Parsed email
  const [username, setUsername] = useState("");
  const [domain, setDomain] = useState("");

  // Guide visibility
  const [generated, setGenerated] = useState(false);

  // Error visibility
  const [showErrors, setShowErrors] = useState(false);

  // Parse email
  useEffect(() => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(email)) {
      setUsername("");
      setDomain("");
      return;
    }

    const [user, dom] = email.split("@");
    setUsername(user);
    setDomain(dom);
  }, [email]);

  // Auto-generate if URL params exist
  useEffect(() => {
    if (params.get("email") && params.get("password")) {
      setGenerated(true);
    }
  }, []);

  // Validation
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const validEmail = emailRegex.test(email);

  const validPassword = password.startsWith("cfut_");
  const validName = name.trim().length > 0;

  const ready = validEmail && validName && validPassword;

  // Masked password for display
  const maskedPassword = validPassword ? "cfut_••••••••••••••••••••" : password;

  const generateGuide = () => {
    if (!ready) {
      setShowErrors(true);
      return;
    }

    setParams({
      email,
      name,
      password,
      provider,
    });

    setGenerated(true);
  };

  const reset = () => {
    navigate(`/tools/email?provider=${provider}`);
    setEmail("");
    setName("");
    setPassword("");
    setGenerated(false);
    setShowErrors(false);
  };

  return (
    <div className="page">
      <div className="page-header fade-in-up">
        <h1>Email Setup Guide</h1>
        <p>
          {provider === "hungernet"
            ? "Generate a HungerNet email setup guide."
            : "Generate a Cloudflare email setup guide."}
        </p>
      </div>

      <section className="section">
        {!generated && (
          <GlassCard className="fade-in-up" style={{ padding: "var(--space-5)" }}>
            <h3>Enter Your Details</h3>
            <p style={{ marginBottom: "var(--space-4)" }}>
              Fill out the fields below to generate a personalized setup guide.
            </p>

            {/* Input row */}
            <div className="input-row">
              <div className="input-field">
                <div className="input-wrapper">
                  <InputBox
                    value={email}
                    onChange={setEmail}
                    placeholder="Email (you@example.com)"
                  />
                  {showErrors && !validEmail && (
                    <div className="input-error">Please enter a valid email address</div>
                  )}
                </div>
              </div>

              <div className="input-field">
                <div className="input-wrapper">
                  <InputBox
                    value={name}
                    onChange={setName}
                    placeholder="Name (John Doe)"
                  />
                  {showErrors && !validName && (
                    <div className="input-error">Name cannot be empty</div>
                  )}
                </div>
              </div>

              <div className="input-field">
                <div className="input-wrapper">
                  <InputBox
                    value={password}
                    onChange={setPassword}
                    placeholder="API Token (cfut_...)"
                  />
                  {showErrors && !validPassword && (
                    <div className="input-error">API token must begin with cfut_</div>
                  )}
                </div>
              </div>
            </div>

            <GlassButton
              size="md"
              variant="primary"
              onClick={generateGuide}
            >
              <Icon name="check" size={16} />
              Generate Guide
            </GlassButton>
          </GlassCard>
        )}

        {generated && (
          <GlassCard className="fade-in-up" style={{ padding: "var(--space-5)" }}>
            <div className="section-header">
              <div className="section-label">Setup Guide</div>
              <h2>Your Configuration</h2>
              <p>
                This guide is customized for <strong>{email}</strong>.
              </p>
            </div>

            <div className="faq-list stagger" style={{ marginTop: "var(--space-5)" }}>
              <FaqAccordion
                q="1. Forwarding Setup"
                a={
                  provider === "hungernet" ? (
                    <>
                      <p>
                        Before you can receive mail using your domain, forwarding must be
                        enabled. DM me your email address and I will set this up for you.
                        You will receive a Cloudflare verification email — open it
                        and approve the forwarding request.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        Before you can receive mail using your domain, forwarding must be
                        enabled. You can do this by logging into the Cloudflare Dashboard
                        and navigating to the Email Routing section. You will receive a
                        Cloudflare verification email — open it and approve the forwarding
                        request.
                      </p>
                    </>
                  )
                }
              />

              <FaqAccordion
                q="2. Add Your Address in Gmail"
                a={
                  <>
                    <p><strong>Inside Gmail:</strong></p>
                    <ul style={{ paddingLeft: "1.5rem", listStyleType: "disc" }}>
                      <li>Settings</li>
                      <li>See all settings</li>
                      <li>Accounts and import</li>
                      <li>Send mail as</li>
                      <li>Add another email address</li>
                    </ul>
                  </>
                }
              />

              <FaqAccordion
                q="3. Information Setup"
                a={
                  <>
                    <div className="smtp-grid">
                      <CopyField label="Name" value={name} />
                      <CopyField label="Email address" value={email} />
                      <CopyField label="Treat as an alias" value="No" />
                    </div>

                    <p style={{ marginTop: "var(--space-3)" }}>
                      Click <strong>Next Step</strong>.
                    </p>
                  </>
                }
              />
              
              <FaqAccordion
                q="4. SMTP Configuration"
                a={
                  <>
                    <div className="smtp-grid">
                      <CopyField label="SMTP Server" value="smtp.mx.cloudflare.net" />
                      <CopyField label="Port" value="465" />
                      <CopyField label="Username" value="api_token" />
                      <CopyField
                        label="Password"
                        value={password}
                        displayValue={maskedPassword}
                      />
                      <CopyField label="Security" value="SSL" />
                    </div>

                    <p style={{ marginTop: "var(--space-3)" }}>
                      Click <strong>Add account</strong>. Google will send a verification
                      email — open it and confirm.
                    </p>
                  </>
                }
              />

              <FaqAccordion
                q="5. Finished"
                a={
                  provider === "hungernet" ? (
                    <>
                      <p>
                        You can now send mail from <strong>{email}</strong> using{" "}
                        <strong>HungerNet's</strong> email service.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        You can now send mail from <strong>{email}</strong>.
                      </p>
                    </>
                  )
                }
              />
            </div>

            <GlassButton
              variant="ghost"
              size="sm"
              style={{ marginTop: "var(--space-4)" }}
              onClick={reset}
            >
              <Icon name="arrowLeft" size={16} />
              Back
            </GlassButton>
          </GlassCard>
        )}
      </section>
    </div>
  );
}
