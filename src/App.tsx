import { type FormEvent, useEffect, useState } from 'react'
import devisLogo from './assets/devis1.png'
import './App.css'

type QuoteForm = {
  service: string
  cantonId: string
  firstName: string
  lastName: string
  phone: string
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

type SubmitStatus = 'idle' | 'submitting' | 'saved' | 'missingConfig' | 'error'
type JsonpResponse = {
  ok: boolean
  error?: string
}

const googleScriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL?.trim() ?? ''
const geoAdminFindUrl = 'https://api3.geo.admin.ch/rest/services/api/MapServer/find'
const cantonLayer = 'ch.swisstopo.swissboundaries3d-kanton-flaeche.fill'

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

const subsidyTopics = [
  {
    title: 'Diagnostic énergétique',
    amount: 'Souvent partiellement pris en charge',
    text: 'Un CECB Plus ou un conseil énergétique peut aider à prioriser les travaux avant de déposer une demande.',
  },
  {
    title: 'Isolation du bâtiment',
    amount: 'Aide souvent calculée au m²',
    text: 'Façade, toiture, murs ou sols peuvent être soutenus lorsque les exigences techniques du canton sont respectées.',
  },
  {
    title: 'Remplacement du chauffage',
    amount: 'Forfaits possibles de plusieurs milliers de CHF',
    text: 'Les aides visent surtout le passage du mazout, gaz ou chauffage électrique vers des solutions renouvelables.',
  },
  {
    title: 'Rénovation globale',
    amount: 'Bonus possibles selon le canton',
    text: 'Les projets combinant isolation, chauffage et amélioration énergétique peuvent recevoir un soutien plus important.',
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
  cantonId: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
}

const formatCanton = (canton: Canton) =>
  `${String(canton.id).padStart(2, '0')} - ${canton.name} (${canton.abbreviation})`

const createCantonSearchUrl = (term: string) => {
  const url = new URL(geoAdminFindUrl)
  url.searchParams.set('layer', cantonLayer)
  url.searchParams.set('searchText', term)
  url.searchParams.set('searchField', 'name')
  url.searchParams.set('returnGeometry', 'false')
  url.searchParams.set('contains', 'true')
  return url
}

const mapCantonResponses = (responses: SwissGeoAdminResponse[]) => {
  const cantonsById = responses
    .flatMap((response) => response.results ?? [])
    .reduce<Map<number, Canton>>((current, result) => {
      const name = result.attributes.name
      const abbreviation = result.attributes.ak

      if (name && abbreviation) {
        current.set(result.id, { id: result.id, name, abbreviation })
      }

      return current
    }, new Map())

  return [...cantonsById.values()].sort((a, b) => a.id - b.id)
}

const loadSwissCantons = async (signal: AbortSignal) => {
  const responses = await Promise.all(
    cantonSearchTerms.map(async (term) => {
      const response = await fetch(createCantonSearchUrl(term), { signal })

      if (!response.ok) {
        throw new Error('Swiss GeoAdmin API unavailable')
      }

      return (await response.json()) as SwissGeoAdminResponse
    }),
  )

  const cantons = mapCantonResponses(responses)
  return cantons.length >= 26 ? cantons : fallbackCantons
}

const submitLeadToGoogleSheet = async (form: QuoteForm, canton: Canton | undefined) => {
  if (!googleScriptUrl) {
    return 'missingConfig' satisfies SubmitStatus
  }

  const url = new URL(googleScriptUrl)
  url.searchParams.set('action', 'submit')
  url.searchParams.set('submittedAt', new Date().toISOString())
  url.searchParams.set('service', form.service)
  url.searchParams.set('cantonNumber', String(canton?.id ?? ''))
  url.searchParams.set('cantonName', canton?.name ?? '')
  url.searchParams.set('cantonAbbreviation', canton?.abbreviation ?? '')
  url.searchParams.set('firstName', form.firstName)
  url.searchParams.set('lastName', form.lastName)
  url.searchParams.set('phone', form.phone)
  url.searchParams.set('email', form.email)
  url.searchParams.set('source', 'DEVIS SWISS')

  const response = await requestJsonp(url)

  if (!response.ok) {
    throw new Error(response.error ?? 'Lead save failed')
  }

  return 'saved' satisfies SubmitStatus
}

const requestJsonp = (url: URL) =>
  new Promise<JsonpResponse>((resolve, reject) => {
    const callbackName = `__devisSwiss${Date.now()}${Math.random()
      .toString(36)
      .slice(2)}`
    const callbacks = window as typeof window & Record<string, (data: JsonpResponse) => void>
    const script = document.createElement('script')

    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('Apps Script timeout'))
    }, 12000)

    const cleanup = () => {
      window.clearTimeout(timeout)
      delete callbacks[callbackName]
      script.remove()
    }

    callbacks[callbackName] = (data) => {
      cleanup()
      resolve(data)
    }

    url.searchParams.set('callback', callbackName)
    script.src = url.toString()
    script.async = true
    script.onerror = () => {
      cleanup()
      reject(new Error('Apps Script URL invalid or unavailable'))
    }

    document.body.append(script)
  })

function App() {
  const [form, setForm] = useState<QuoteForm>(initialForm)
  const [cantons, setCantons] = useState<Canton[]>(fallbackCantons)
  const [isLoadingCantons, setIsLoadingCantons] = useState(true)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')

  useEffect(() => {
    const controller = new AbortController()

    const syncCantons = async () => {
      try {
        setCantons(await loadSwissCantons(controller.signal))
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

    void syncCantons()

    return () => controller.abort()
  }, [])

  const selectedCanton = cantons.find((canton) => String(canton.id) === form.cantonId)
  const isSubmitting = submitStatus === 'submitting'
  const canSubmit =
    form.cantonId.length > 0 &&
    form.firstName.trim().length > 1 &&
    form.lastName.trim().length > 1 &&
    form.phone.trim().length >= 7 &&
    form.email.includes('@') &&
    !isSubmitting

  const updateForm = (field: keyof QuoteForm, value: string) => {
    setSubmitStatus('idle')
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submitQuote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setSubmitStatus('submitting')

    try {
      setSubmitStatus(await submitLeadToGoogleSheet(form, selectedCanton))
    } catch {
      setSubmitStatus('error')
    }
  }

  if (submitStatus === 'saved') {
    return (
      <main className="done-page">
        <section className="done-card" role="status">
          <a className="brand" href="#top" aria-label="DEVIS SWISS accueil">
            <img className="brand-logo" src={devisLogo} alt="DEVIS SWISS" />
          </a>
          <div className="done-mark" aria-hidden="true">
            ✓
          </div>
          <p className="eyebrow">Demande reçue</p>
          <h1>Votre demande a bien été enregistrée.</h1>
          <p>
            Merci. Nous avons reçu vos informations et nous vous contacterons
            prochainement pour la suite de votre demande.
          </p>
          <button
            className="secondary-link"
            type="button"
            onClick={() => {
              setForm(initialForm)
              setSubmitStatus('idle')
            }}
          >
            Faire une autre demande
          </button>
        </section>
      </main>
    )
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DEVIS SWISS accueil">
          <img className="brand-logo" src={devisLogo} alt="DEVIS SWISS" />
        </a>
        <nav aria-label="Navigation principale">
          <a href="#services">Services</a>
          <a href="#subventions">Subventions</a>
          <a href="#fonctionnement">Fonctionnement</a>
          <a href="#devis">Demande</a>
        </nav>
      </header>

      <section className="quote-section" id="devis">
        <form className="quote-form" onSubmit={submitQuote}>
          <div className="form-header">
            <p className="eyebrow">Comparateur de devis en Suisse</p>
            <h1>
              Recevez gratuitement 4 devis
              <span>et choisissez la meilleure offre</span>
            </h1>
            <p>
              Choisissez un service et laissez vos coordonnées. Votre demande
              est préparée en quelques secondes, gratuitement et sans engagement.
            </p>
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
                    {formatCanton(canton)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prénom
              <input
                value={form.firstName}
                onChange={(event) => updateForm('firstName', event.target.value)}
                placeholder="Prénom"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Nom
              <input
                value={form.lastName}
                onChange={(event) => updateForm('lastName', event.target.value)}
                placeholder="Nom"
              />
            </label>
            <label>
              Téléphone
              <input
                value={form.phone}
                onChange={(event) => updateForm('phone', event.target.value)}
                placeholder="+41 79 000 00 00"
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
            {isSubmitting ? 'Envoi...' : 'Comparer 4 devis gratuits'}
          </button>

          {submitStatus === 'missingConfig' && (
            <p className="success-message" role="status">
              Configuration manquante. Contactez l’administrateur du site.
            </p>
          )}

          {submitStatus === 'error' && (
            <p className="error-message" role="alert">
              L’envoi a échoué. Vérifiez l’URL Apps Script et réessayez.
            </p>
          )}
        </form>
      </section>

      <section className="subsidy-section" id="subventions">
        <div className="section-title">
          <p className="eyebrow">Subventions en Suisse</p>
          <h2>Aides possibles pour vos travaux énergétiques.</h2>
          <p>
            En Suisse, les aides dépendent du canton, de la commune, du type de
            bâtiment et des travaux prévus. Les montants ne sont donc pas
            automatiques, mais plusieurs mesures peuvent réduire le coût final
            d’un projet bien préparé.
          </p>
        </div>

        <div className="subsidy-grid">
          {subsidyTopics.map((topic) => (
            <article key={topic.title}>
              <h3>{topic.title}</h3>
              <strong>{topic.amount}</strong>
              <p>{topic.text}</p>
            </article>
          ))}
        </div>

        <div className="subsidy-process">
          <h3>Comment cela se passe généralement ?</h3>
          <ol>
            <li>Identifier le canton et le type exact de travaux.</li>
            <li>Vérifier les conditions avant de signer ou commencer le chantier.</li>
            <li>Demander les devis et préparer les documents techniques.</li>
            <li>Déposer la demande de subvention auprès du service compétent.</li>
            <li>Attendre la décision, puis lancer les travaux si le dossier est accepté.</li>
          </ol>
          <p>
            Les aides peuvent aller de quelques centaines de francs pour un
            conseil ou un diagnostic à plusieurs milliers de francs pour un
            chauffage renouvelable ou une rénovation énergétique plus complète.
            À titre indicatif, certains programmes cantonaux publient des aides
            CECB Plus autour de 500 à 1’500 CHF et des contributions par surface
            énergétique de référence qui peuvent varier fortement selon la
            classe atteinte et le canton. Le montant exact doit toujours être
            confirmé avant le début des travaux.
          </p>
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
