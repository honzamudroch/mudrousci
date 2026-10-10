// Vzdělávací obsah k fázím cyklu. Obecný text, schválený 19. 9. 2026.
// Pravidla tónu (docs/cyklus-plan.md): "V těle" je fyziologie a smí tvrdit;
// "Jak fáze probíhá" (dříve "Jak to často bývá") má vždy "často" / "u mnoha žen", nikdy "vždy";
// tipy jsou doporučení, ne příkazy. Personalizace "U Lucky" přijde v F2 vedle textu, ne místo něj.

import type { Faze } from './cyklus'

export type Vrstva = 'telo' | 'prozivani' | 'tipy_ona' | 'tipy_on' | 'vztah' | 'pohyb'

export const VRSTVY: { key: Vrstva; label: string; skupina: 'zaklad' | 'tipy' }[] = [
  { key: 'telo',      label: 'V těle',              skupina: 'zaklad' },
  { key: 'prozivani', label: 'Jak fáze probíhá',    skupina: 'zaklad' },
  { key: 'tipy_ona',  label: 'Pro ni',              skupina: 'tipy' },
  { key: 'tipy_on',   label: 'Pro něj',             skupina: 'tipy' },
  { key: 'vztah',     label: 'Vztah a romantika',   skupina: 'tipy' },
  { key: 'pohyb',     label: 'Pohyb a sport',       skupina: 'tipy' },
]

export const DNY: Record<Faze, string> = {
  menstruace:  'zhruba dny 1 až 5',
  folikularni: 'zhruba dny 6 až 13',
  ovulace:     'zhruba dny 12 až 16',
  lutealni:    'zhruba dny 15 až 28',
}

export const VETA_ANTIKONCEPCE =
  'Kalendářní odhad je orientace, ne antikoncepce. Přesnost zvyšuje měření bazální teploty nebo LH testy.'

export const POZNAMKA_EVIDENCE =
  'Tipy ke sportu a vztahu jsou "co často pomáhá", ne pravidla. Každé tělo a každý pár je jiný.'

export const OBSAH: Record<Faze, Record<Vrstva, string>> = {
  menstruace: {
    telo:
      'Estrogen i progesteron jsou na dně. Děloha odlučuje sliznici, proto krvácení. Tělo uvolňuje prostaglandiny, které dělohu stahují, odtud křeče. Klesá zásoba železa.',
    prozivani:
      'Nejnižší energie celého cyklu. U mnoha žen potřeba klidu, tepla a spánku, větší citlivost na chlad a hluk. Chuť být sama nebo jen s někým blízkým. Bolest se liší od žádné po vyřazující, u každé ženy jinak.',
    tipy_ona:
      'Teplo na břicho. Klidný pohyb, procházka nebo protažení, ne výkon. Železo a hořčík (listová zelenina, luštěniny, tmavá čokoláda). Nevyčítat si, že toho zvládne míň.',
    tipy_on:
      'Nabídnout, ne pobízet. Teplo, jídlo, ticho, převzít věci, které nemusí čekat. Neplánovat na tyhle dny náročné výlety. Zeptat se „co potřebuješ?" a brát odpověď vážně, i když zní „nic".',
    vztah:
      'Blízkost bez nároků: objetí, teplo, společné ticho, film pod dekou. Sex je pro některé ženy v těchto dnech příjemný (uvolňuje křeče), pro jiné vůbec; ptát se, nepředpokládat. Cenné je, že je tu, ne co dělá.',
    pohyb:
      'Lehce a podle pocitu, ne podle plánu. Chůze, jóga, protažení, plavání, pokud je jí příjemné. Při bolesti vynechat těžké zvedání a intervaly. Mírný pohyb často křeče zmírní, ale nutit se do něj nemá smysl.',
  },
  folikularni: {
    telo:
      'Hypofýza vysílá FSH, ve vaječníku dozrává folikul a estrogen roste den za dnem. Děložní sliznice se obnovuje. Mírně stoupá i testosteron. Tělo se připravuje na ovulaci.',
    prozivani:
      'Energie se vrací a roste. U mnoha žen období nápadů, chuti začínat, plánovat a učit se. Nálada bývá stabilnější, sebevědomí roste. Tělo je výkonnější a rychleji regeneruje.',
    tipy_ona:
      'Dobrý čas začínat nové věci, plánovat, rozhodovat se. Náročnější trénink tělo snáší líp než jindy. Lehčí, čerstvá strava.',
    tipy_on:
      'Ideální okno na plánování společných věcí: dovolená, návštěvy, větší rozhodnutí. Dobrý čas na aktivní podniky. Naslouchat nápadům a nebrzdit je.',
    vztah:
      'Chuť na nové zážitky. Dobrý čas na rande venku, výlet, něco, co jste ještě nedělali. Zájem o sex u mnoha žen roste s estrogenem. Rozhovory o budoucnosti a plánech jdou lehčeji než jindy.',
    pohyb:
      'Nejlepší okno na tvrdý trénink a nové výzvy. Tělo snáší vyšší zátěž, rychleji regeneruje, síla a vytrvalost rostou. Silový trénink, intervaly, dlouhé túry, učení nových dovedností.',
  },
  ovulace: {
    telo:
      'Estrogen vrcholí a spustí LH vlnu, vajíčko se uvolní z folikulu. Přežije zhruba den, spermie v těle až pět dní, proto je plodné okno delší než ovulace sama. Po ovulaci stoupne bazální teplota o 0,2 až 0,5 °C. Hlen řídne a je tažný.',
    prozivani:
      'Vrchol energie a chuti do života. U mnoha žen nejvíc společenská, komunikativní a sebevědomá fáze. Vyšší libido. Někdy krátká bolest v podbřišku na jedné straně, citlivější prsa.',
    tipy_ona:
      'Využít energii na věci, které potřebují lidi: schůzky, prezentace, setkání. Pokud není žádoucí otěhotnění, vědět, kde je plodné okno, a nespoléhat na kalendář jako na antikoncepci.',
    tipy_on:
      'Nejlepší dny na společné podniky, návštěvy a oslavy. Otevřenost k blízkosti bývá nejvyšší. Nejistota plodného okna platí pro oba stejně.',
    vztah:
      'Vrchol přitažlivosti a libida, u mnoha žen nejvíc flirtu a otevřenosti. Ideální dny na romantický víkend nebo návštěvu. Zároveň nejplodnější dny, takže rozhodnutí o antikoncepci je společné, ne jen její.',
    pohyb:
      'Vrchol výkonu: závody, dlouhé výkony, osobní maxima. Pozor na jednu věc: kolem ovulace jsou vlivem estrogenu volnější vazy a mírně stoupá riziko podvrtnutí kolene a kotníku. Delší rozcvičení, pozornost při doskocích a změnách směru.',
  },
  lutealni: {
    telo:
      'Z prasklého folikulu vzniká žluté tělísko a vyrábí progesteron. Ten zahušťuje sliznici, zvyšuje teplotu a zpomaluje trávení. Když nedojde k oplodnění, tělísko zaniká, progesteron i estrogen padají a to spustí menstruaci. Poslední týden před ní je PMS.',
    prozivani:
      'Luteální fáze se často dělí na dvě poloviny. První bývá klidná a soustředěná, dobrá na dotahování rozdělaných věcí. Druhá, zhruba poslední týden před menstruací, přináší u mnoha žen podrážděnost, úzkost, únavu, chuť na sladké, nadýmání a přecitlivělost. Klesá tolerance k hluku a nepořádku, roste potřeba hranic a klidu.',
    tipy_ona:
      'Dotahovat, ne začínat. Pomalejší pohyb, víc spánku. Komplexní sacharidy a hořčík proti chutím a výkyvům nálady. Vědět, že PMS je hormonální, ne osobní selhání.',
    tipy_on:
      'Nebrat podrážděnost osobně, je to chemie, ne názor na tebe. Snížit nároky, nezahajovat velké rozhovory v posledním týdnu. Praktická pomoc má větší cenu než rady. Teplo, klid, a sladké bez komentáře.',
    vztah:
      'První půlka klidná, hezká na domácí večery. Poslední týden potřebuje jistotu a klid, ne velká gesta; drobné pozornosti fungují líp než překvapení. Neplánovat těžké rozhovory o vztahu do PMS. Když vzniknou, nechat je doznít a vrátit se k nim po menstruaci.',
    pohyb:
      'První půlka ještě dobrá na vytrvalost mírnou intenzitou. Druhá půlka: tělo hůř chladí, klidová teplota je vyšší, spánek horší, regenerace pomalejší. Snížit objem i intenzitu, víc odpočinku, lehčí síla, jóga. Chuť na sladké souvisí s vyšší spotřebou energie, není to slabost.',
  },
}
