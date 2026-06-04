// side-effect imports to register all templates
import './offer-modal.tsx'
import './app-ad.tsx'
import './app-ad-fullscreen.tsx'
import './device-frame.tsx'
import './urgent-offer.tsx'
import './clean-authority.tsx'
import './discreto-confidencial.tsx'
import './oferta-black.tsx'

// re-export the populated registry for the SSR templates bundle (esbuild)
export { registry } from './registry.ts'
