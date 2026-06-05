export function PaymentLogos() {
  return (
    <div className="pay-logos-block">
      <div className="pay-logos-express">
        <button className="pay-btn pay-btn-dark" type="button" title="Apple Pay">
          <svg viewBox="0 0 70 26" width="70" height="26" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.2 6.4c.7-.9 1.2-2.1 1-3.3-1.1.1-2.3.7-3 1.6-.7.8-1.3 2-.1 3.1 1.1.1 2.3-.5 2.9-1.4z" fill="#fff"/>
            <path d="M14.2 8c-1.7-.1-3.1.9-3.9.9-.8 0-2.1-.9-3.4-.9-1.8 0-3.5 1.1-4.4 2.8-1.9 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.3 2.6 1.3 0 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.4-1.3 3.3-2.5 1-1.5 1.4-2.9 1.4-3-2.6-.9-2.7-5.1.3-6.5-1-1.5-2.5-2.4-4.1-2.4-.4.1-.6.1-.6.5z" fill="#fff"/>
            <text x="22" y="17" fontFamily="Arial,sans-serif" fontSize="11" fontWeight="700" fill="#fff" letterSpacing="0.5">Pay</text>
          </svg>
        </button>

        <button className="pay-btn" type="button" title="Google Pay" style={{background:'#fff'}}>
          <svg viewBox="0 0 70 26" width="70" height="26" xmlns="http://www.w3.org/2000/svg">
            <text x="5" y="18" fontFamily="Arial,sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.3">
              <tspan fill="#4285F4">G</tspan>
              <tspan fill="#EA4335">o</tspan>
              <tspan fill="#FBBC05">o</tspan>
              <tspan fill="#34A853">g</tspan>
              <tspan fill="#EA4335">l</tspan>
              <tspan fill="#4285F4">e</tspan>
            </text>
            <text x="42" y="18" fontFamily="Arial,sans-serif" fontSize="11" fontWeight="700" fill="#3c4043" letterSpacing="0.3">Pay</text>
          </svg>
        </button>

        <button className="pay-btn" type="button" title="PayPal" style={{background:'#fff'}}>
          <svg viewBox="0 0 70 26" width="70" height="26" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 5H7c-.3 0-.6.2-.6.5L4.2 18.5c0 .2.1.4.3.4H6.7c.3 0 .5-.2.5-.5l.6-3.5c.1-.3.3-.5.6-.5H10c3.1 0 4.9-1.5 5.4-4.4.2-1.3 0-2.3-.6-3-.7-.7-1.9-1-3.3-1z" fill="#003087"/>
            <path d="M11.1 9.3c-.2 1.6-1.5 2.7-3.1 2.7H6.8l.8-4.9H9c1.7 0 2.5.8 2.1 2.2z" fill="#009cde"/>
            <path d="M25.5 9.1h-2.3c-.2 0-.4.1-.5.4v.9c-.7-.9-1.9-1.5-3.3-1.5-3.2 0-5.9 2.5-6.2 5.7-.2 1.7.2 3.2 1 4.2.9 1 2.2 1.5 3.6 1.5 1.9 0 3.1-1 3.1-1l-.1.8c0 .2.1.4.3.4h2c.3 0 .5-.2.5-.5l1.2-10.2c0-.3-.1-.7-.5-.7zm-3.2 5.5c-.2 1.5-1.5 2.6-3.1 2.6-.8 0-1.4-.3-1.8-.7-.4-.5-.6-1.2-.5-2 .2-1.5 1.5-2.6 3-2.6.8 0 1.4.3 1.8.8.5.5.7 1.3.6 1.9z" fill="#003087"/>
          </svg>
        </button>
      </div>

      <div className="pay-logos-sep"><span>ou par carte</span></div>

      <div className="pay-logos-cards">
        <button className="pay-btn pay-btn-dark" type="button" title="Visa">
          <svg viewBox="0 0 70 26" width="70" height="26" xmlns="http://www.w3.org/2000/svg">
            <rect width="70" height="26" rx="3" fill="#1A1F71"/>
            <path d="M26.5 17.5l1.5-8h1.9l-1.5 8h-1.9zm6-8.1c-.4-.2-1.1-.4-1.9-.4-2.1 0-3.5 1-3.5 2.5 0 1.1 1 1.7 1.8 2.1.8.4 1.1.7 1.1 1.1 0 .5-.7.8-1.3.8-.9 0-1.4-.1-2.1-.5l-.3-.1-.3 1.8c.5.2 1.4.5 2.3.5 2.2 0 3.7-1 3.7-2.7 0-.9-.6-1.6-1.9-2.2-.8-.4-1.3-.6-1.3-1 0-.3.4-.6 1.2-.6.7 0 1.2.1 1.6.3l.2.1.5-1.7zm7 0h-1.6c-.5 0-.8.1-1 .6l-2.6 6.5h1.9s.3-.9.4-1.1h2.3l.2 1.1h1.7l-1.3-7.1zm-2.7 4.6l.8-2.3.5 2.3h-1.3zM24 9.3l-2 5.5-.2-1c-.4-1.3-1.6-2.7-2.9-3.4l1.9 6.8h2l2.9-7.9H24z" fill="white"/>
            <path d="M21.3 9.3h-3v.2c2.3.6 3.8 2 4.4 3.6l-.6-3.3c-.1-.4-.5-.5-.8-.5z" fill="#FAA61A"/>
          </svg>
        </button>

        <button className="pay-btn pay-btn-dark" type="button" title="Mastercard">
          <svg viewBox="0 0 70 26" width="70" height="26" xmlns="http://www.w3.org/2000/svg">
            <rect width="70" height="26" rx="3" fill="#252525"/>
            <circle cx="26" cy="13" r="8" fill="#EB001B"/>
            <circle cx="44" cy="13" r="8" fill="#F79E1B"/>
            <path d="M35 6.8c2.1 1.6 3.4 4 3.4 6.2s-1.3 4.6-3.4 6.2c-2.1-1.6-3.4-4-3.4-6.2s1.3-4.6 3.4-6.2z" fill="#FF5F00"/>
          </svg>
        </button>

        <button className="pay-btn pay-btn-dark" type="button" title="American Express">
          <svg viewBox="0 0 70 26" width="70" height="26" xmlns="http://www.w3.org/2000/svg">
            <rect width="70" height="26" rx="3" fill="#2557D6"/>
            <path d="M8.5 16.5H10l.6-1.5h3l.5 1.5h1.6l-3-7.5h-1.7l-3 7.5zm2.7-2.9l1-2.5.9 2.5h-1.9zm7.4 2.9v-7.5h2.7l1.5 5 1.5-5H27v7.5h-1.8v-5.4l-2 5.4h-1.3l-2.1-5.4v5.4h-1.7zm9.3 0v-7.5h6.1v1.5h-4.3v1.5h4v1.5h-4v1.6h4.3v1.5h-6.1zm7 0v-7.5h1.8l3.5 4.7V9h1.7v7.5h-1.7l-3.5-4.8v4.8h-1.8zm9.3-3.8c0-2.2 1.6-3.9 4.1-3.9 1.1 0 2 .3 2.7 1l-1.1 1.1c-.4-.4-.9-.7-1.6-.7-1.4 0-2.3.9-2.3 2.4s.9 2.4 2.3 2.4c.7 0 1.2-.2 1.6-.7l1.1 1.1c-.7.7-1.6 1.1-2.7 1.1-2.6.1-4.1-1.7-4.1-3.8z" fill="white"/>
          </svg>
        </button>
      </div>

      <div className="pay-secure">🔒 Paiement 100% sécurisé · SSL 256 bits</div>
    </div>
  )
}
