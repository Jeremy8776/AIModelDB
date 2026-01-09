/**
 * Extensive list of explicit/NSFW keywords for content filtering.
 * Separated from nsfw.ts to maintain code readability.
 */

export const EXPLICIT_NAME_TERMS = [
    // Generic / Categories
    'porn', 'porno', 'pornography', 'hentai', 'xxx', 'rule34', 'r34', 'yiff', 'fetish', 'bdsm', 'kink',
    'nsfw', '18+', 'explicit', 'lewd', 'ecchi', 'ahegao', 'nude', 'naked', 'erotic', 'erotica',
    'adult only', 'adults only', 'mature content', 'r-18', 'r18', 'x-rated', 'xrated',
    'smut', 'filth', 'obscene', 'indecent', 'lascivious', 'salacious',

    // Anatomy - Male
    'penis', 'dick', 'cock', 'prick', 'schlong', 'dong', 'member', 'shaft', 'phallus',
    'balls', 'testicle', 'testicles', 'scrotum', 'nutsack', 'ballsack', 'foreskin',
    'erection', 'erected', 'boner', 'hard-on', 'hardon', 'stiffy', 'woody',

    // Anatomy - Female  
    'pussy', 'vagina', 'vulva', 'labia', 'clit', 'clitoris', 'cunt', 'twat', 'snatch', 'cooch',
    'boobs', 'tits', 'breasts', 'titties', 'boobies', 'knockers', 'jugs', 'melons', 'rack',
    'nipple', 'nipples', 'areola', 'areolas', 'cleavage', 'sideboob', 'underboob',

    // Anatomy - General
    'sex', 'sexual', 'genitals', 'genital', 'genitalia', 'privates', 'private parts',
    'anal', 'ass', 'arse', 'butt', 'buttocks', 'booty', 'bum', 'rear', 'backside',
    'anus', 'rectum', 'asshole', 'butthole', 'arsehole',
    'cum', 'semen', 'sperm', 'jizz', 'spunk', 'seed', 'load', 'nut',
    'g-spot', 'prostate', 'perineum', 'taint',

    // Acts - Oral
    'blowjob', 'bj', 'oral', 'oral sex', 'fellatio', 'cocksucking', 'deepthroat', 'throatfuck',
    'cunnilingus', 'pussy eating', 'eating out', 'going down', 'muff diving',
    'rimjob', 'rimming', 'analingus', 'ass licking', 'tossing salad',
    'facefuck', 'face fuck', 'irrumatio', 'gagging',

    // Acts - Penetration
    'fuck', 'fucking', 'fucked', 'intercourse', 'coitus', 'copulation',
    'penetration', 'penetrating', 'insertion', 'pounding', 'railing', 'banging',
    'creampie', 'cream pie', 'internal cumshot', 'breeding', 'impregnation',
    'anal sex', 'assfuck', 'ass fuck', 'sodomy', 'buggery',
    'double penetration', 'dp', 'triple penetration', 'airtight',

    // Acts - Manual
    'handjob', 'hj', 'hand job', 'jerking off', 'jacking off', 'stroking',
    'fingering', 'finger fuck', 'finger bang', 'fisting', 'fist fuck',
    'titjob', 'titfuck', 'tit fuck', 'paizuri', 'boobjob',
    'footjob', 'foot job', 'assjob', 'thighjob', 'hotdogging',
    'groping', 'fondling', 'feeling up', 'molesting',

    // Acts - Masturbation
    'masturbation', 'masturbate', 'masturbating', 'jerk off', 'jack off', 'wank', 'wanking',
    'fap', 'fapping', 'self-pleasure', 'playing with yourself', 'rubbing one out',
    'orgasm', 'climax', 'cumming', 'coming', 'getting off', 'finishing',
    'ejaculation', 'ejaculate', 'ejaculating', 'squirt', 'squirting', 'gushing',

    // Acts - Group
    'gangbang', 'gang bang', 'orgy', 'group sex', 'swingers', 'swinging',
    'threesome', 'ffm', 'mmf', 'mfm', 'fmf', 'foursome', 'moresome',
    'bukkake', 'gokkun', 'cumswap', 'snowballing', 'felching',
    'train', 'running a train', 'spitroast', 'spit roast', 'eiffel tower',

    // Acts - Other
    'stripping', 'striptease', 'strip tease', 'lapdance', 'lap dance', 'pole dance',
    'moan', 'moaning', 'screaming', 'begging', 'dirty talk',
    'flashing', 'exhibitionism', 'voyeur', 'voyeurism', 'peeping',

    // Positions
    'prone bone', 'pronebone', 'doggystyle', 'doggy style', 'doggy', 'from behind',
    'missionary', 'cowgirl', 'reverse cowgirl', 'amazon', 'reverse amazon',
    '69', 'sixty-nine', 'sixtynine', 'scissoring', 'tribbing', 'tribadism',
    'spooning', 'spoon', 'face-sitting', 'facesitting', 'queening', 'smothering',
    'standing', 'standing sex', 'against wall', 'wall sex', 'shower sex',
    'wheelbarrow', 'pile driver', 'piledriver', 'mating press', 'full nelson',
    'lotus', 'suspended', 'pretzel', 'butter churner', 'helicopter',

    // Descriptors/Slang - People
    'milf', 'dilf', 'gilf', 'cougar', 'sugar daddy', 'sugar mommy', 'sugar baby',
    'slut', 'slutty', 'whore', 'hoe', 'skank', 'tramp', 'bimbo', 'nympho', 'nymphomaniac',
    'hooker', 'escort', 'call girl', 'prostitute', 'sex worker', 'stripper', 'cam girl',
    'pornstar', 'porn star', 'adult actress', 'adult actor', 'av idol', 'jav',

    // Descriptors/Slang - States
    'horny', 'aroused', 'turned on', 'in heat', 'throbbing', 'aching', 'dripping', 'wet',
    'hard', 'stiff', 'engorged', 'swollen', 'throbbing',
    'virgin', 'virginity', 'deflower', 'cherry', 'first time',

    // Descriptors/Slang - Size/Body
    'big dick', 'huge cock', 'massive', 'bbc', 'bwc', 'monster cock', 'horse cock',
    'tight pussy', 'wet pussy', 'shaved', 'hairy', 'busty', 'stacked', 'thicc', 'thick',
    'petite', 'tiny', 'flat chest', 'big ass', 'phat ass', 'bubble butt', 'pawg',
    'curvy', 'voluptuous', 'hourglass', 'athletic', 'muscular', 'chubby', 'bbw', 'ssbbw',

    // Relationship/Scenario
    'cuckold', 'cuck', 'hotwife', 'bull', 'swinger', 'polyamory', 'open relationship',
    'cheating', 'affair', 'adultery', 'unfaithful', 'side chick', 'mistress',
    'incest', 'stepmom', 'stepdad', 'stepsis', 'stepbro', 'stepmother', 'stepfather',
    'stepsister', 'stepbrother', 'stepdaughter', 'stepson', 'mommy', 'daddy',
    'taboo', 'forbidden', 'wrong', 'naughty',

    // Sex toys / Objects
    'dildo', 'dildos', 'vibrator', 'vibe', 'butt plug', 'buttplug', 'plug', 'anal plug',
    'anal beads', 'ben wa balls', 'kegel balls', 'cock ring', 'cockring', 'penis ring',
    'fleshlight', 'pocket pussy', 'onahole', 'sex toy', 'sex toys', 'adult toy',
    'love doll', 'sex doll', 'blow up doll', 'real doll', 'sex machine', 'fucking machine',
    'strapon', 'strap-on', 'strap on', 'double dildo', 'double ended',
    'rabbit vibrator', 'wand', 'hitachi', 'magic wand', 'sybian',
    'prostate massager', 'anal vibrator', 'egg vibrator', 'bullet vibrator',

    // BDSM / Bondage gear
    'handcuffs', 'cuffs', 'shackles', 'rope', 'rope bondage', 'suspension',
    'blindfold', 'gag', 'ball gag', 'ballgag', 'ring gag', 'spider gag', 'bit gag',
    'nipple clamps', 'clamps', 'clothespins', 'weights',
    'whip', 'flogger', 'crop', 'riding crop', 'cane', 'paddle', 'belt', 'switch',
    'collar', 'leash', 'lead', 'harness', 'body harness', 'head harness',
    'spreader bar', 'hogtie', 'armbinder', 'monoglove',
    'chastity', 'chastity belt', 'chastity cage', 'cock cage', 'denial',

    // Fetish / Kink categories
    'foot fetish', 'feet', 'toes', 'soles', 'footworship', 'feet worship', 'foot worship',
    'armpit', 'armpits', 'armpit fetish', 'smell', 'scent', 'musk',
    'pantyhose', 'stockings', 'nylons', 'fishnets', 'tights', 'hosiery',
    'latex', 'leather', 'pvc', 'vinyl', 'rubber', 'spandex', 'lycra',
    'corset', 'bustier', 'garter', 'garter belt', 'suspenders', 'lingerie', 'lace',
    'thong', 'g-string', 'panties', 'underwear', 'bra', 'bralette',
    'see-through', 'sheer', 'mesh', 'transparent', 'crotchless', 'assless', 'cupless',
    'uniform', 'cosplay', 'schoolgirl', 'nurse', 'maid', 'secretary', 'cheerleader',

    // BDSM dynamics
    'dominant', 'dom', 'domme', 'dominatrix', 'master', 'mistress', 'sir', 'madam',
    'submissive', 'sub', 'slave', 'pet', 'kitten', 'puppy', 'brat',
    'femdom', 'maledom', 'switch', 'power exchange', 'power play',
    'humiliation', 'degradation', 'objectification', 'dehumanization',
    'discipline', 'punishment', 'reward', 'training', 'obedience',

    // BDSM activities
    'spanking', 'slapping', 'hitting', 'beating', 'whipping', 'flogging', 'caning',
    'choking', 'breath play', 'asphyxiation', 'strangling',
    'wax play', 'ice play', 'temperature play', 'sensation play',
    'edging', 'orgasm control', 'orgasm denial', 'ruined orgasm', 'forced orgasm',
    'teasing', 'tease and denial', 'cbT', 'cock and ball torture', 'ballbusting',
    'pegging', 'prostate play', 'prostate milking',

    // Roleplay / Scenarios
    'roleplay', 'role play', 'fantasy', 'scenario', 'pretend',
    'rape', 'rape fantasy', 'cnc', 'consensual non-consent', 'ravishment',
    'kidnap', 'abduction', 'captive', 'prisoner', 'hostage',
    'blackmail', 'coercion', 'forced', 'reluctant', 'dubcon',
    'sleep', 'sleeping', 'somnophilia', 'passed out', 'drugged',
    'public', 'public sex', 'outdoor', 'outdoors', 'caught', 'getting caught',

    // Alternative / Extreme
    'sissy', 'sissification', 'feminization', 'crossdress', 'crossdressing', 'cd',
    'trap', 'femboy', 'twink', 'bear', 'otter', 'twunk',
    'futanari', 'futa', 'dickgirl', 'shemale', 'ladyboy', 'newhalf',
    'hermaphrodite', 'intersex', 'androgynous',
    'tentacle', 'tentacles', 'monster', 'alien', 'demon', 'orc', 'goblin',
    'vore', 'unbirth', 'absorption', 'digestion',
    'guro', 'gore', 'ryona', 'snuff',
    'bestiality', 'zoophilia', 'animal', 'horse', 'dog', 'knot', 'knotting',
    'golden shower', 'piss', 'pee', 'urine', 'watersports', 'wetting',
    'scat', 'shit', 'feces', 'poop', 'defecation', 'coprophilia',
    'enema', 'douche', 'anal douche',
    'inflation', 'belly inflation', 'cum inflation', 'stuffing',
    'prolapse', 'gape', 'gaping', 'stretching', 'ruined',

    // Body modifications / States
    'pierced', 'piercing', 'piercings', 'genital piercing', 'nipple piercing',
    'tattooed', 'tattoo', 'tattoos', 'body paint', 'body writing',
    'oiled', 'oily', 'wet body', 'sweaty', 'messy', 'sloppy',
    'spread legs', 'spread eagle', 'spreading', 'open', 'gaping',
    'bent over', 'on knees', 'on all fours', 'presenting', 'offering',
    'tied up', 'bound', 'restrained', 'immobilized', 'helpless',
    'gagged', 'silenced', 'blindfolded', 'hooded', 'masked',
    'collared', 'leashed', 'caged', 'locked',
    'bruised', 'marked', 'welts', 'spanked red',

    // Anime/Hentai specific
    'hentai', 'doujinshi', 'doujin', 'h-manga', 'eroge', 'nukige',
    'loli', 'lolicon', 'shota', 'shotacon', 'oppai', 'paizuri',
    'netorare', 'ntr', 'netori', 'oyakodon', 'nakadashi',
    'mind break', 'corruption', 'hypnosis', 'mind control',
    'ahegao', 'fucked silly', 'heart eyes', 'rolling eyes',
    'torogao', 'pleasure face', 'o-face',

    // Modifiers often associated with NSFW content
    'uncensored', 'censored', 'mosaic', 'pixelated', 'decensored',
    'nude patch', 'nude mod', 'adult mod', 'lewd mod',
    'topless', 'bottomless', 'fully nude', 'completely naked', 'stark naked',
    'no clothes', 'undressing', 'stripping', 'disrobing',
    'exposed', 'revealing', 'scandalous', 'risque', 'risqué',
    'sexy', 'seductive', 'sensual', 'erotic', 'alluring', 'enticing',
    'provocative', 'suggestive', 'teasing', 'flirty', 'come hither',
    'naughty', 'dirty', 'filthy', 'raunchy', 'obscene', 'vulgar',
    'smut', 'smutty', 'pornographic', 'x-rated', 'triple x',

    // Common misspellings/variations
    'pr0n', 'p0rn', 'secks', 'sexx', 'seks', 'bewbs', 'b00bs', 't1ts',
    'a$$', '@ss', 'd1ck', 'c0ck', 'pu$$y', 'fvck', 'f*ck', 'sh1t'
];

export const EXPLICIT_TAGS = [...EXPLICIT_NAME_TERMS];
