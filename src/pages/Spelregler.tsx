import { Link } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Flame, Layers3, Trophy } from 'lucide-react';

const sections = [
  {
    title: 'Målet',
    icon: Trophy,
    body: 'Bli först av med alla dina kort. Du ska spela bort handkorten, sedan de tre uppvända bordskorten och till sist de tre nedåtvända korten.',
  },
  {
    title: 'Starten',
    icon: Layers3,
    body: 'Varje spelare får 3 nedåtvända kort, 3 uppvända kort på bordet och 3 kort på hand. Innan spelet börjar får du byta mellan handen och de uppvända bordskorten för att lägga upp en så stark uppställning som möjligt.',
  },
  {
    title: 'Så spelar du',
    icon: CircleAlert,
    body: 'Du spelar ett eller flera kort med samma värde. Kortet du lägger måste vara lika högt eller högre än det översta kortet i högen. Så länge talongen finns kvar fylls handen upp till 3 kort efter din tur.',
  },
  {
    title: 'Specialkort',
    icon: Flame,
    body: 'En 2:a kan alltid spelas och öppnar upp högen, men i den här versionen måste samma spelare direkt lägga ett kort ovanpå tvåan innan turen går vidare. En 10:a bränner högen direkt. Fyra kort av samma värde överst i högen bränner också högen. När högen bränns får samma spelare fortsätta.',
  },
];

const Spelregler = () => {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <div className="gradient-radial fixed inset-0 pointer-events-none" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-card/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Till lobby
        </Link>

        <section className="rounded-3xl border border-border bg-card/80 p-5 text-left shadow-2xl backdrop-blur-sm sm:p-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-primary">Spelregler</p>
          <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">Vändtia, som den fungerar här</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Det här är appens egen variant av vändtia. Reglerna nedan följer spelet som faktiskt är implementerat, så de matchar vad som händer i både solo- och onlineläget.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map(({ title, icon: Icon, body }) => (
            <section key={title} className="rounded-2xl border border-border bg-card/70 p-5 text-left backdrop-blur-sm">
              <div className="mb-3 inline-flex rounded-xl bg-primary/12 p-2 text-primary">
                <Icon size={18} />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
              <p className="text-sm leading-7 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>

        <section className="rounded-2xl border border-border bg-card/70 p-5 text-left backdrop-blur-sm">
          <h2 className="mb-3 text-lg font-semibold text-foreground">När du inte kan spela</h2>
          <p className="mb-3 text-sm leading-7 text-muted-foreground">
            Om du har handkort eller uppvända kort kvar och inget av dem går att lägga, kan du ibland chansa från talongen. Då drar du ett kort. Kan det spelas, läggs det direkt. Kan det inte spelas måste du ta upp hela högen och fortsätta din tur.
          </p>
          <p className="text-sm leading-7 text-muted-foreground">
            Om du väljer att ta upp högen får du alla kort i högen på handen och spelar vidare direkt. När handen är slut spelar du dina uppvända kort. När även de är slut spelar du ett nedåtvänt kort i taget på chans. Passar det inte måste du ta upp högen plus det kortet.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card/70 p-5 text-left backdrop-blur-sm">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Värt att tänka på</h2>
          <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
            <li>Du kan lägga flera kort samtidigt, men bara om de har samma värde.</li>
            <li>Om ditt sista handkort matchar ett uppvänt bordskort får du lägga det direkt i samma tur.</li>
            <li>Du får inte ta upp högen om du precis har lagt en 2:a och måste täcka den.</li>
            <li>Första spelaren som blir av med alla sina kort vinner direkt.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Spelregler;
