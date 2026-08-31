/*
 * Site configuration for lead capture, analytics, and booking.
 *
 * Everything here is optional and safe to leave blank: with empty values the
 * site behaves exactly as before (contact forms open the visitor's email
 * client, no analytics load, "Book a call" falls back to email). Fill a value
 * in to switch the corresponding feature on — no other code changes needed.
 */
window.NIMBLYTICA_CONFIG = {
  form: {
    /*
     * Web3Forms access key (free, instant, no backend to host):
     * create one at https://web3forms.com and paste it here. When set, the
     * contact forms submit to Web3Forms and email the lead to the address you
     * registered, instead of opening the visitor's mail client.
     */
    web3formsAccessKey: "",
    endpoint: "https://api.web3forms.com/submit",
    subject: "Live ops board — new inquiry",
    // Fallback address used when no access key is configured (mailto flow).
    contactEmail: "hello@nimblytica.com"
  },

  analytics: {
    // Plausible: set to your site domain, e.g. "nimblytica.com". Empty = off.
    plausibleDomain: "",
    plausibleSrc: "https://plausible.io/js/script.js",
    // GA4: set your measurement id, e.g. "G-XXXXXXX". Empty = off.
    ga4MeasurementId: "",
    // When true, every tracked event is also logged to the browser console.
    debug: false
  },

  booking: {
    // Calendly scheduling URL, e.g. "https://calendly.com/your-org/intro".
    // When set, "Book a call" buttons open the Calendly popup; empty = the
    // buttons fall back to the email contact flow.
    calendlyUrl: ""
  }
};
