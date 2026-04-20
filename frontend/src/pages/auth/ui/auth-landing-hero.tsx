type AuthLandingHeroProps = {
  onEnterLogin: () => void
}

export function AuthLandingHero({ onEnterLogin }: AuthLandingHeroProps) {
  return (
    <main className="min-h-screen">
      <header>Landing hero placeholder</header>
      <section>
        <p>Guest landing section placeholder</p>
        <button onClick={onEnterLogin} type="button">
          Enter login
        </button>
      </section>
    </main>
  )
}
