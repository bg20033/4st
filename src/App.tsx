import { type FormEvent, useEffect, useState } from 'react'
import './App.css'

type QuoteForm = {
  service: string
  project: string
  cantonId: string
  name: string
  email: string
}

type Canton = {
  id: number
  name: string
  abbreviation: string
}

type SwissGeoAdminResult = {
  id: number
  attributes: {
    ak?: string
    name?: string
  }
}

type SwissGeoAdminResponse = {
  results?: SwissGeoAdminResult[]
}

const services = [
  'Rénovation',
  'Peinture',
  'Déménagement',
  'Nettoyage',
  'Électricité',
  'Plomberie',
  'Fenêtres',
  'Jardin',
]

const benefits = [
  '100% gratuit',
  'Sans engagement',
  'Jusqu’à 4 offres',
  'Prestataires locaux',
]

const steps = [
  {
    title: 'Décrivez votre projet',
    text: 'Expliquez votre besoin, votre région et le délai souhaité.',
  },
  {
    title: 'Recevez 4 devis',
    text: 'Votre demande est préparée pour obtenir des offres comparables.',
  },
  {
    title: 'Choisissez sereinement',
    text: 'Comparez les prix, les délais et les prestations avant de décider.',
  },
]

const faqs = [
  {
    question: 'Le service est-il vraiment gratuit ?',
    answer: 'Oui. La demande est gratuite et vous gardez le choix à chaque étape.',
  },
  {
    question: 'Suis-je obligé d’accepter une offre ?',
    answer: 'Non. Vous comparez les devis et choisissez uniquement si une offre vous convient.',
  },
  {
    question: 'Quels types de travaux sont acceptés ?',
    answer: 'Rénovation, peinture, nettoyage, déménagement, dépannage et autres services du bâtiment.',
  },
]

const fallbackCantons: Canton[] = [
  { id: 1, name: 'Zürich', abbreviation: 'ZH' },
  { id: 2, name: 'Bern', abbreviation: 'BE' },
  { id: 3, name: 'Luzern', abbreviation: 'LU' },
  { id: 4, name: 'Uri', abbreviation: 'UR' },
  { id: 5, name: 'Schwyz', abbreviation: 'SZ' },
  { id: 6, name: 'Obwalden', abbreviation: 'OW' },
  { id: 7, name: 'Nidwalden', abbreviation: 'NW' },
  { id: 8, name: 'Glarus', abbreviation: 'GL' },
  { id: 9, name: 'Zug', abbreviation: 'ZG' },
  { id: 10, name: 'Fribourg', abbreviation: 'FR' },
  { id: 11, name: 'Solothurn', abbreviation: 'SO' },
  { id: 12, name: 'Basel-Stadt', abbreviation: 'BS' },
  { id: 13, name: 'Basel-Landschaft', abbreviation: 'BL' },
  { id: 14, name: 'Schaffhausen', abbreviation: 'SH' },
  { id: 15, name: 'Appenzell Ausserrhoden', abbreviation: 'AR' },
  { id: 16, name: 'Appenzell Innerrhoden', abbreviation: 'AI' },
  { id: 17, name: 'St. Gallen', abbreviation: 'SG' },
  { id: 18, name: 'Graubünden', abbreviation: 'GR' },
  { id: 19, name: 'Aargau', abbreviation: 'AG' },
  { id: 20, name: 'Thurgau', abbreviation: 'TG' },
  { id: 21, name: 'Ticino', abbreviation: 'TI' },
  { id: 22, name: 'Vaud', abbreviation: 'VD' },
  { id: 23, name: 'Valais', abbreviation: 'VS' },
  { id: 24, name: 'Neuchâtel', abbreviation: 'NE' },
  { id: 25, name: 'Genève', abbreviation: 'GE' },
  { id: 26, name: 'Jura', abbreviation: 'JU' },
]

const cantonSearchTerms = ['a', 'e', 'i', 'o', 'u', 'y']

const initialForm: QuoteForm = {
  service: services[0],
  project: '',
  cantonId: '',
  name: '',
  email: '',
}

function App() {
  const [form, setForm] = useState<QuoteForm>(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [cantons, setCantons] = useState<Canton[]>(fallbackCantons)
  const [isLoadingCantons, setIsLoadingCantons] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const loadCantons = async () => {
      try {
        const responses = await Promise.all(
          cantonSearchTerms.map(async (term) => {
            const url = new URL(
              'https://api3.geo.admin.ch/rest/services/api/MapServer/find',
            )
            url.searchParams.set(
              'layer',
              'ch.swisstopo.swissboundaries3d-kanton-flaeche.fill',
            )
            url.searchParams.set('searchText', term)
            url.searchParams.set('searchField', 'name')
            url.searchParams.set('returnGeometry', 'false')
            url.searchParams.set('contains', 'true')

            const response = await fetch(url, { signal: controller.signal })

            if (!response.ok) {
              throw new Error('Swiss GeoAdmin API unavailable')
            }

            return (await response.json()) as SwissGeoAdminResponse
          }),
        )

        const loadedCantons = responses
          .flatMap((response) => response.results ?? [])
          .reduce<Map<number, Canton>>((current, result) => {
            const name = result.attributes.name
            const abbreviation = result.attributes.ak

            if (name && abbreviation) {
              current.set(result.id, { id: result.id, name, abbreviation })
            }

            return current
          }, new Map())

        const nextCantons = [...loadedCantons.values()].sort((a, b) => a.id - b.id)

        if (nextCantons.length >= 26) {
          setCantons(nextCantons)
        }
      } catch {
        if (!controller.signal.aborted) {
          setCantons(fallbackCantons)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCantons(false)
        }
      }
    }

    void loadCantons()

    return () => controller.abort()
  }, [])

  const canSubmit =
    form.project.trim().length > 6 &&
    form.cantonId.length > 0 &&
    form.name.trim().length > 1 &&
    form.email.includes('@')

  const updateForm = (field: keyof QuoteForm, value: string) => {
    setSubmitted(false)
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submitQuote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (canSubmit) {
      setSubmitted(true)
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DEVIS SUITE accueil">
          <span>DEVIS</span>
          <strong>SUITE</strong>
        </a>
        <nav aria-label="Navigation principale">
          <a href="#services">Services</a>
          <a href="#fonctionnement">Fonctionnement</a>
          <a href="#devis">Demande</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Comparateur de devis en Suisse</p>
          <h1>
            Recevez gratuitement 4 devis
            <span>et choisissez la meilleure offre</span>
          </h1>
          <p>
            Une seule demande pour comparer des prestataires qualifiés près de
            chez vous. Simple, clair, gratuit et sans engagement.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#devis">
              Recevoir mes 4 devis
            </a>
            <a className="secondary-link" href="#fonctionnement">
              Comment ça marche
            </a>
          </div>
          <div className="trust-row" aria-label="Avantages principaux">
            {benefits.map((benefit) => (
              <span key={benefit}>{benefit}</span>
            ))}
          </div>
        </div>

        <aside className="hero-card" aria-label="Résumé de la demande">
          <div className="score-card">
            <span>Note moyenne</span>
            <strong>4.8/5</strong>
            <small>Demandes traitées avec suivi clair</small>
          </div>
          <img
            src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80"
            alt="Plan de construction et outils de chantier"
          />
          <div className="mini-stats">
            <div>
              <strong>2 min</strong>
              <span>pour déposer</span>
            </div>
            <div>
              <strong>24-48h</strong>
              <span>réponse habituelle</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="quote-section" id="devis">
        <div className="quote-intro">
          <p className="eyebrow">Demande express</p>
          <h2>Votre devis commence ici.</h2>
          <p>
            Choisissez un service, ajoutez quelques détails et préparez une
            demande professionnelle.
          </p>
          <div className="service-chips" id="services" aria-label="Services populaires">
            {services.map((service) => (
              <button
                className={form.service === service ? 'active' : ''}
                key={service}
                type="button"
                onClick={() => updateForm('service', service)}
              >
                {service}
              </button>
            ))}
          </div>
        </div>

        <form className="quote-form" onSubmit={submitQuote}>
          <div className="form-header">
            <span>DEVIS SUITE</span>
            <strong>Recevoir gratuitement 4 devis</strong>
          </div>

          <label>
            Service
            <select
              value={form.service}
              onChange={(event) => updateForm('service', event.target.value)}
            >
              {services.map((service) => (
                <option key={service}>{service}</option>
              ))}
            </select>
          </label>

          <label>
            Votre projet
            <textarea
              value={form.project}
              onChange={(event) => updateForm('project', event.target.value)}
              placeholder="Exemple: repeindre un appartement de 3 pièces avant remise des clés."
              rows={4}
            />
          </label>

          <div className="form-row">
            <label>
              Canton
              <select
                value={form.cantonId}
                onChange={(event) => updateForm('cantonId', event.target.value)}
              >
                <option value="">
                  {isLoadingCantons ? 'Chargement des cantons...' : 'Choisir un canton'}
                </option>
                {cantons.map((canton) => (
                  <option key={canton.id} value={String(canton.id)}>
                    {String(canton.id).padStart(2, '0')} - {canton.name} ({canton.abbreviation})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nom
              <input
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Votre nom"
              />
            </label>
          </div>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateForm('email', event.target.value)}
              placeholder="vous@email.ch"
            />
          </label>

          <button className="submit-button" type="submit" disabled={!canSubmit}>
            Comparer 4 devis gratuits
          </button>

          <p className="privacy-note">
            Gratuit, sans engagement. Vos informations servent uniquement à
            préparer la demande.
          </p>

          {submitted && (
            <p className="success-message" role="status">
              Merci. Votre demande est prête: vous pourrez comparer 4 devis et
              choisir la meilleure offre.
            </p>
          )}
        </form>
      </section>

      <section className="proof-band" aria-label="Garanties">
        <div>
          <strong>4 devis</strong>
          <span>pour comparer les prix</span>
        </div>
        <div>
          <strong>0 CHF</strong>
          <span>demande sans frais</span>
        </div>
        <div>
          <strong>1 demande</strong>
          <span>transmise clairement</span>
        </div>
      </section>

      <section className="steps-section" id="fonctionnement">
        <div className="section-title">
          <p className="eyebrow">Comment ça marche</p>
          <h2>Un parcours clair en 3 étapes.</h2>
        </div>
        <div className="steps">
          {steps.map((step, index) => (
            <article key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="faq-section">
        <div className="section-title">
          <p className="eyebrow">Questions fréquentes</p>
          <h2>Simple et transparent.</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <article key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
