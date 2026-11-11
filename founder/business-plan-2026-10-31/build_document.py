from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

OUT=Path('/Users/macvincent/appjobs-v2/founder/business-plan-2026-10-31')
doc=Document()
s=doc.sections[0]; s.page_height=Cm(29.7); s.page_width=Cm(21); s.top_margin=Cm(1.8); s.bottom_margin=Cm(1.7); s.left_margin=Cm(2); s.right_margin=Cm(2)
styles=doc.styles
for name in ['Normal','Title','Subtitle','Heading 1','Heading 2','Heading 3']:
 st=styles[name]; st.font.name='Calibri'; st.font.color.rgb=RGBColor(0,0,0)
styles['Normal'].font.size=Pt(10.5); styles['Normal'].paragraph_format.space_after=Pt(7); styles['Normal'].paragraph_format.line_spacing=1.08
for n,size in [('Title',27),('Subtitle',13),('Heading 1',20),('Heading 2',12.5),('Heading 3',11)]:
 styles[n].font.size=Pt(size)
 styles[n].paragraph_format.space_after=Pt(8)
 styles[n].paragraph_format.space_before=Pt(12)
 styles[n].paragraph_format.keep_with_next=True
footer=s.footer.paragraphs[0]; footer.alignment=WD_ALIGN_PARAGRAPH.RIGHT
r=footer.add_run('JobTracker  |  31 octobre 2026  |  '); r.font.size=Pt(8)
f=OxmlElement('w:fldSimple');f.set(qn('w:instr'),'PAGE');footer._p.append(f)
doc.core_properties.title='JobTracker Business plan et plan de lancement'
doc.core_properties.subject='Positionnement modèle économique et plan d’action sur 90 jours'
doc.core_properties.author='JobTracker'

def p(t,bold=False):
 x=doc.add_paragraph();r=x.add_run(t);r.bold=bold;return x

def h(t):doc.add_heading(t,2)
def bullet(t):
 x=doc.add_paragraph(style='List Bullet');x.add_run(t);return x

def page(title):
 doc.add_page_break();doc.add_heading(title,1)

def table(headers,rows,widths):
 t=doc.add_table(rows=1, cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
 for c,w in zip(t.columns,widths):c.width=Cm(w)
 for c,w,txt in zip(t.rows[0].cells,widths,headers):c.width=Cm(w);c.text=txt
 for row in rows:
  cells=t.add_row().cells
  for c,w,txt in zip(cells,widths,row):c.width=Cm(w);c.text=str(txt)
 for j,row in enumerate(t.rows):
  trPr=row._tr.get_or_add_trPr();ns=OxmlElement('w:cantSplit');trPr.append(ns)
  if j==0:
   e=OxmlElement('w:tblHeader');trPr.append(e)
  for i,c in enumerate(row.cells):
   c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
   tcPr=c._tc.get_or_add_tcPr()
   sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'263746' if j==0 else ('F2F5F7' if j%2==0 else 'FFFFFF'));tcPr.append(sh)
   borders=OxmlElement('w:tcBorders')
   for edge in ['top','left','bottom','right']:
    el=OxmlElement('w:'+edge);el.set(qn('w:val'),'single');el.set(qn('w:sz'),'4');el.set(qn('w:color'),'D9D9D9');borders.append(el)
   tcPr.append(borders)
   margins=OxmlElement('w:tcMar')
   for edge in ['top','left','bottom','right']:
    el=OxmlElement('w:'+edge);el.set(qn('w:w'),'95');el.set(qn('w:type'),'dxa');margins.append(el)
   tcPr.append(margins)
   for pp in c.paragraphs:
    pp.paragraph_format.space_after=Pt(3);pp.paragraph_format.space_before=Pt(2);pp.paragraph_format.line_spacing=1.05
    for rr in pp.runs:
     rr.font.size=Pt(9);rr.bold=j==0
     if j==0:rr.font.color.rgb=RGBColor(255,255,255)
 doc.add_paragraph().paragraph_format.space_after=Pt(1)
 return t

# 1
p('31 OCTOBRE 2026')
doc.add_paragraph('JobTracker',style='Title')
doc.add_paragraph('Business plan et plan de lancement',style='Subtitle')
p('Un document de pilotage pour préparer le produit, la landing page et une première offre commerciale. Il sert à décider quoi livrer, quoi tester et à quelles conditions ouvrir le service.')
h('La décision proposée')
p('Concentrer le lancement sur une candidature précise : un CV vérifié, une offre choisie, une comparaison compréhensible, une lettre relue et un suivi conservé. Préparer une bêta privée avant une ouverture publique, puis tester le paiement après observation de la valeur et mesure des coûts.',True)
h('Le modèle envisagé')
p('Une application destinée d’abord aux Product Owners et Product Managers francophones en recherche active. Un pass limité dans le temps est une piste cohérente avec un besoin temporaire. Le prix de 39 € pour 90 jours est une hypothèse de travail, sans vente ni validation de marché établies.')
h('Les conditions de lancement')
p('La revue du 31 octobre a identifié un socle d’authentification à sécuriser, des traces IA à isoler et des contrôles qualité à remettre au vert. La landing doit donner accès à une demande enregistrée ou au produit et montrer une démonstration fidèle de l’interface.')
h('Les résultats attendus à 90 jours')
bullet('Un parcours utilisable et protégé, avec suppression des données et limites d’usage testées.')
bullet('Des observations de candidats réels, des mesures d’activation, de retour utile et de coût.')
bullet('Une décision étayée sur le périmètre, le prix et la poursuite de la commercialisation.')
p('Les objectifs, budgets et scénarios de ce document sont proposés à la décision. Ils ne constituent ni des résultats obtenus ni une prévision de ventes garantie.')
h('Repères de lecture')
p('Pages 2 à 4 : preuves, clients et offre. Pages 5 à 7 : acquisition, produit et landing. Pages 8 à 10 : plan d’action et économie. Pages 11 et 12 : pilotage, risques et décisions.')

# 2
page('1 Point de départ et niveau de preuve')
h('Ce qui existe')
p('Le dépôt appjobs-v2 contient une application Next.js et React, un backend Supabase, des fonctions IA et un dossier founder. Les routes et composants couvrent l’import CV, l’import d’offres, l’analyse, la génération de lettres et le suivi. La présence de ces chemins logiciels ne suffit pas à prouver leur fiabilité en production.')
p('La version locale de la landing présente une cible PO/PM, des exemples fictifs identifiés et une FAQ qui explicite les limites du score. Les CTA ouvrent un courriel. Ils ne constituent pas un accès autonome ni un formulaire de demande confirmé.')
table(['Preuve','Constat au 31 octobre','Conséquence'],[
('Contrôles du code','Build réussi ; 300 tests réussis sur 311 ; lint bloqué','Corriger avant ouverture'),
('Panels founder','Deux panels synthétiques de 20 personas','Questions à tester uniquement'),
('Prix','39 €/90 jours proposé ; variantes présentes','Aucun prix validé'),
('Adoption et ventes','Aucune donnée exploitable fournie dans le dossier','Ne pas assimiler à zéro'),
('Coûts unitaires','Non mesurés dans les preuves disponibles','Aucune marge réelle calculable')],[3.1,7.3,6.6])
h('Les hypothèses commerciales')
p('Les utilisateurs pourraient préférer un contexte CV conservé, une comparaison explicable et un suivi associé au travail réalisé. Ils pourraient aussi rester avec ChatGPT et un tableur. Les entretiens devront déterminer si l’avantage compense le changement d’habitude et justifie un paiement.')
h('La référence à retenir')
p('Cette analyse s’appuie sur appjobs-v2, qui contient le dossier founder fourni et la landing récente. Le chat initial était ouvert dans appjobs, un autre état de travail. Le dépôt et le déploiement de référence devront être choisis avant toute implémentation.')
p('Aucun parcours authentifié complet ni déploiement public n’a été vérifié durant la revue. Les captures portent sur la landing ordinateur, la connexion et le premier écran mobile. Les points techniques sont issus d’une inspection ciblée du code.')

#3
page('2 Clients et problème à résoudre')
h('Premier segment à tester')
p('Product Owners et Product Managers francophones en recherche active, disposant d’un CV existant et d’une offre précise à laquelle ils envisagent de répondre. Le recrutement des testeurs doit privilégier ce comportement plutôt qu’un âge ou une durée de chômage supposés.')
h('Le besoin concret')
p('À chaque offre, le candidat doit comprendre les attentes, retrouver les expériences pertinentes, vérifier sa formulation, préparer son message et conserver la suite de ses démarches. JobTracker peut réduire la fragmentation entre ces tâches en réutilisant le contexte du CV.')
table(['Situation','Besoin à explorer','Preuve à recueillir'],[
('Une offre intéressante vient d’être trouvée','Décider si une candidature mérite du temps','Décision expliquée après comparaison'),
('Le candidat adapte son dossier','Améliorer sans inventer son expérience','Suggestions conservées et corrigées'),
('Plusieurs démarches sont en cours','Retrouver travail et prochaines actions','Mise à jour utile après sept jours')],[4.6,6.1,6.3])
h('Pourquoi commencer par ce segment')
p('La connaissance du métier peut faciliter la rédaction des exemples et l’évaluation des erreurs. Cette proximité aide à construire le premier test ; elle ne démontre ni la taille du marché ni une disposition supérieure à payer.')
h('Dimensionner un marché accessible')
p('Le potentiel de marché reste à documenter. Avant un dossier destiné à un financeur, recueillir des sources sur les candidats concernés, leur fréquence de recherche et les canaux réellement accessibles. Ne pas utiliser la totalité des actifs français comme marché adressable.')
p('Pour les 90 premiers jours, raisonner en accès concret : nombre de candidats qualifiés que le fondateur peut atteindre, nombre de sessions réalisables et capacité de support. Un objectif de cinq premières observations est une capacité de recherche proposée, pas une estimation de marché.')
h('Ce qui déclencherait un changement de cible')
p('Si les testeurs comprennent le produit mais n’y trouvent pas d’utilité répétée, tester un segment adjacent avec le même parcours avant d’ajouter des fonctions. Séparer les retours des utilisateurs habituels de ChatGPT, des tableurs et d’outils spécialisés.')

#4
page('3 Positionnement et offre')
h('Proposition de valeur')
p('Préparer une candidature à partir de son CV et de l’offre, puis garder la suite au même endroit. Le bénéfice à démontrer est la continuité du travail et la qualité des décisions prises, pas la seule production d’un score ou d’un texte.')
h('Différenciation à démontrer')
p('Face à ChatGPT et au tableur, JobTracker doit prouver que le contexte conservé, les critères visibles et le lien entre analyse, lettre et statut apportent une utilité supérieure pour le candidat. Face aux outils spécialisés, ne pas revendiquer une exclusivité française ou une meilleure précision sans comparaison documentée.')
p('Les pages officielles consultées le 31 octobre confirment l’existence d’un suivi gratuit chez Teal et Huntr. Le suivi seul constitue donc une base concurrentielle difficile à monétiser ; la valeur du parcours complet reste à tester. Sources en page 12.')
h('Offre de départ envisagée')
table(['Élément','Proposition à valider'],[
('Accès initial','Bêta privée avec invitation ou demande d’accès confirmée'),
('Noyau','CV vérifié + offre + comparaison + suggestions + lettre + suivi'),
('Format payant','Pass de 90 jours sans reconduction comme hypothèse'),
('Prix de référence','39 € au total, à tester après calcul des coûts'),
('Limites','Nombre de dossiers et régénérations fixés après mesure'),
('Support','Canal identifié et capacité de réponse annoncée réaliste')],[4.1,12.9])
h('Conditions qui doivent rester explicites')
p('Une candidature préparée n’est pas une candidature envoyée. Le score est un repère interne, pas une probabilité d’entretien ou le résultat d’un ATS employeur. Une reformulation ne crée pas une compétence. L’utilisateur relit et décide des changements comme de l’envoi.')
p('Ne pas promettre un usage illimité. Les 20 dossiers et deux régénérations évoqués dans le dossier pricing sont des quantités de travail proposées, qui doivent être dimensionnées et appliquées côté serveur avant de figurer dans une offre.')

#5
page('4 Acquisition et stratégie commerciale')
h('Un canal prioritaire au démarrage')
p('Commencer par une approche manuelle ciblée sur LinkedIn et des communautés produit auxquelles le fondateur a légitimement accès. Préparer une démonstration utile et une invitation à tester une candidature concrète. Le plan n’autorise ni publication ni prise de contact automatique.')
p('Éviter un lancement public large et des dépenses publicitaires tant que le parcours, l’instrumentation et le budget d’usage ne sont pas maîtrisés. Le SEO et les partenariats peuvent être développés après identification des questions récurrentes et des preuves utiles.')
h('Les trois étapes du parcours commercial')
table(['Étape','Action proposée','Mesure utile'],[
('Comprendre','Cinq sessions avec candidats consentants','Blocages et utilité du résultat'),
('Faire essayer','Démonstration puis accès bêta maîtrisé','Activation et aide nécessaire'),
('Tester la vente','Une offre bornée au prix affiché','Paiements réels et usage après achat')],[3.3,7.3,6.4])
h('Expériences à préparer')
bullet('Message de recrutement centré sur une offre que le candidat prépare déjà. Mesurer réponses et sessions réalisées, sans inventer un taux attendu.')
bullet('Deux présentations éditoriales successives de la même valeur. Tester la compréhension avant d’attribuer un écart de clic à une préférence réelle.')
bullet('Démonstration courte sur des données fictives, puis observation sur le cas du candidat avec son accord. Relever les hésitations avant toute explication du fondateur.')
h('Vendre une offre lisible')
p('Afficher un seul prix et un contenu clair lors du premier test de vente. Comparer 29 € et 39 € uniquement à prestation identique, avec un protocole et un volume permettant d’apprendre. À petit volume, documenter les objections et les achats réels sans présenter le résultat comme un test statistique.')
h('Maîtriser le coût d’acquisition')
p('Suivre séparément dépenses et temps passé. Le coût d’acquisition payé correspond aux dépenses attribuables divisées par les nouveaux clients payants concernés ; le coût complet inclut aussi le temps valorisé. Ne pas financer l’acquisition à partir du chiffre d’affaires brut sans connaître la contribution disponible.')

#6
page('5 Produit à livrer pour le lancement')
h('Un socle sûr avant de vrais CV')
p('Le code examiné utilise encore une authentification locale avec administrateur prédéfini, utilisateurs en mémoire et secret de repli. Le proxy et les routes doivent être alignés sur une session persistante. Les comptes de développement doivent être inopérants dans le chemin de production.')
p('Le client service-role contourne les protections RLS. Certains filtres utilisateur sont présents, mais toutes les routes doivent être vérifiées. Les traces de prompts complètes sont stockées globalement et ne sont pas filtrées par utilisateur dans la route de diagnostic : désactiver ce mécanisme en production ou le cloisonner et le minimiser strictement.')
h('La première candidature')
for t in [
'Compte persistant puis import du CV avec erreurs compréhensibles et reprise possible.',
'Vérification ciblée des informations extraites, sans ressaisie inutile du profil.',
'Ajout d’une offre par texte collé en réutilisant le dialogue existant.',
'Analyse avec critères, incertitudes et faits manquants clairement présentés.',
'Suggestions sélectionnables et restauration du contexte, sans ajout de faits non attestés.',
'Lettre relue, modifiée et sauvegardée ; statut préparé distinct du statut envoyé.',
'Retour à la bonne candidature dans une nouvelle session et accès à la prochaine action.'
]:bullet(t)
h('Qualité et maîtrise des coûts')
p('Réparer le lint et les 11 tests en échec en vérifiant les exigences produit, puis exécuter tests et compilation avant livraison. Ajouter des cas significatifs : données absentes, doublons, accès entre deux comptes, offre malveillante, échec IA et restauration.')
p('Appliquer côté serveur des plafonds par utilisateur et globaux, des tailles d’entrée, des délais et des tentatives bornées. Mesurer le coût sans journaliser le CV. Prévoir un contact de support surveillé et une procédure de retour à la version précédente.')
h('Périmètre à reporter')
p('Garder prospection d’entreprises, recherche multisource, générations en masse et tableaux de bord avancés en accès secondaire. Ne pas casser les fonctions existantes ; faire du parcours unitaire le point de départ et séparer strictement données fictives et données réelles.')

#7
page('6 Landing prête à accueillir les candidats')
h('Conserver une présentation sobre')
p('La landing actuelle possède une hiérarchie lisible et explique honnêtement les limites du score. L’amélioration doit porter d’abord sur le bénéfice, la preuve et l’accès. Une refonte visuelle complète retarderait le lancement sans résoudre les principaux obstacles observés.')
h('Structure recommandée')
table(['Ordre','Contenu','Objectif'],[
('1','Cible PO/PM puis bénéfice concret','Comprendre immédiatement à qui cela sert'),
('2','CTA adapté au mode réel d’accès','Demander un accès ou commencer'),
('3','Capture de l’app sur données fictives','Voir le résultat réellement disponible'),
('4','Trois étapes CV offre candidature','Comprendre l’effort demandé'),
('5','Exemple de comparaison et de lettre','Évaluer l’utilité avant import'),
('6','Traitement du CV et limites du score','Décider en connaissance de cause'),
('7','Accès prix limites et questions','Lever les derniers doutes')],[1.5,8,7.5])
h('Proposition de texte à tester')
p('Surtitre : Pour les Product Owners et Product Managers en recherche.')
p('Titre : Votre CV, cette offre, une candidature mieux préparée.',True)
p('Description : Repérez les correspondances et les écarts, préparez une lettre à relire et retrouvez le suivi dans le même espace.')
p('CTA bêta : Demander un accès bêta. CTA autonome ultérieur : Préparer ma première candidature. Ne pas annoncer un accès immédiat si une validation manuelle est nécessaire.')
h('Critères de réception')
p('Le CTA ne doit plus dépendre d’un client mail. La demande doit être enregistrée et confirmée, avec une erreur récupérable. Vérifier la notification au fondateur et le fonctionnement de la boîte de contact. Réutiliser la route demo-request après vérification plutôt que multiplier les collectes.')
p('Sur mobile, remonter la cible et raccourcir le hero. Vérifier navigation au clavier, focus, zoom 200 %, FAQ, contraste et absence de débordement. Une vraie capture sur données fictives doit être distinguée d’un témoignage ou d’un résultat client.')

#8
page('7 Plan opérationnel sur 90 jours')
p('Le calendrier commence au jour de démarrage effectif. Les périodes sont des fenêtres de planification, pas une date de livraison garantie. Hypothèse de capacité : fondateur seul à temps plein ; à mi-temps, le travail technique demandera un calendrier plus long.')
table(['Période','Priorité','Livrable et condition de passage'],[
('J1 à J10','Socle et confidentialité','Dépôt retenu ; authentification persistante ; accès entre comptes testés ; traces sécurisées ; lint et tests corrigés'),
('J11 à J25','Première candidature','Parcours complet et reprise ; suppression vérifiée ; quotas serveur ; jeu fictif de démonstration'),
('J20 à J35','Landing et accès bêta','Demande confirmée ; capture fidèle ; informations CV ; mesure des étapes'),
('J30 à J50','Bêta observée','Cinq sessions puis observation ≥ 7 jours ; blocages corrigés ; coût par dossier mesuré'),
('J45 à J65','Première offre payante','Quotas et prix décidés ; paiement et droits fiables ; conditions et support prêts'),
('J66 à J90','Apprentissage commercial','Premiers achats si lancement autorisé ; usage et support suivis ; décision de poursuite ou ajustement')],[2.5,4,10.5])
h('Charge de travail indicative')
p('La roadmap détaillée estime 20 à 32 jours de travail pour préparer l’ouverture publique, puis 5 à 9 jours supplémentaires pour un test payant. Les périodes se chevauchent parce que le texte et la préparation des tests peuvent avancer pendant les travaux techniques. Le recrutement, les retours et les corrections peuvent prolonger le calendrier.')
h('Organisation hebdomadaire')
bullet('Début de semaine : choisir un résultat livrable et trois priorités au maximum.')
bullet('Milieu de semaine : tester le parcours complet sur un compte dédié et traiter les blocages avant l’élargissement.')
bullet('Fin de semaine : examiner qualité, activation, retours, coûts et charge de support ; décider de poursuivre ou de corriger.')
h('Règles de passage')
p('Ne pas ouvrir à de vrais CV avant validation du socle, de l’isolation et du cycle de vie des données. Ne pas encaisser avant que paiement, quotas, droits et conditions soient testés. Ne pas augmenter l’acquisition tant que les erreurs et le coût d’usage restent incontrôlés.')

#9
page('8 Modèle économique et besoins de financement')
h('Principes du modèle')
p('Le revenu envisagé provient d’un pass borné et temporaire. Ce modèle évite de supposer que le candidat conservera un abonnement après sa recherche. Un achat récurrent ou un renouvellement ne peut être intégré aux projections sans preuve réelle de réachat.')
h('Hypothèses de simulation')
p('Les valeurs ci-dessous servent uniquement à tester les équations. Aucun devis, coût réel ni traitement fiscal n’est déduit de ces chiffres. Les remplacer par les montants observés et les conditions applicables avant une décision d’investissement.')
table(['Variable','Valeur illustrative','À vérifier'],[
('Prix affiché du pass','39 € pour 90 jours','Acceptation et contenu inclus'),
('Recette disponible par pass','30 €','Après prélèvements applicables frais et remboursements ; hypothèse globale, pas taux fiscal'),
('Coût technique variable','6 € par pass','IA collecte stockage et échecs à mesurer'),
('Support valorisé','5 € par pass','15 minutes à 20 €/h ; hypothèse de temps'),
('Coûts fixes sur 90 jours','450 €','150 €/mois ; budget illustratif'),
('Acquisition sur 90 jours','150 €','Plafond illustratif à autoriser'),
('Travail de construction','25 à 41 jours','20–32 jours puis 5–9 jours ; temps du fondateur')],[5,4.5,7.5])
h('Contribution par pass')
p('Avec ces seules hypothèses : 30 € de recette disponible − 6 € de coût technique − 5 € de support valorisé = 19 € de contribution par pass. Ce montant n’est pas un bénéfice net et n’intègre pas le développement, l’acquisition par client ni la rémunération générale du fondateur.')
h('Besoin de trésorerie à chiffrer')
p('Recenser dépenses de lancement, infrastructure, consommations IA, collecte, formalités, support externe et réserve d’incident. Ajouter les besoins personnels du fondateur pour la période sans revenu. Le montant de financement ne peut pas être établi sans trésorerie disponible, devis, régime applicable et temps mobilisable.')
p('Décision proposée : fixer un plafond de dépenses de validation avant toute campagne, distinct des besoins personnels. Les 600 € de coûts fixes et d’acquisition du modèle sont une simulation, pas une demande de financement approuvée.')

#10
page('9 Scénarios financiers et seuils de décision')
h('Simulation sur une fenêtre de 90 jours')
p('Scénarios de volume uniquement. Ils ne dérivent pas des panels synthétiques et n’attribuent aucune probabilité aux ventes. Recette disponible de 30 € par pass, coûts variables de 11 € dont 5 € de support valorisé, coûts fixes de 450 € et acquisition de 150 €.')
table(['Indicateur','10 pass','30 pass','60 pass'],[
('Encaissements bruts au prix affiché','390 €','1 170 €','2 340 €'),
('Recette disponible simulée','300 €','900 €','1 800 €'),
('Coûts variables et support','110 €','330 €','660 €'),
('Contribution','190 €','570 €','1 140 €'),
('Fixes et acquisition','600 €','600 €','600 €'),
('Solde du modèle','−410 €','−30 €','540 €')],[6.8,3.4,3.4,3.4])
p('Le solde inclut du support valorisé et n’est donc ni un résultat comptable ni un flux de trésorerie exact. Il exclut le développement initial, les besoins personnels et les autres charges non renseignées. Les ventes proches de la fin de période peuvent laisser des coûts de service à supporter après J90.')
h('Seuil de couverture du modèle')
p('600 € ÷ 19 € = 31,58 : il faudrait 32 pass dans cette fenêtre pour couvrir les postes modélisés, à paramètres constants. Ce seuil ne prouve pas que le fondateur peut se rémunérer. Le coût d’acquisition de 150 € doit aussi rester réaliste pour le volume considéré.')
h('Sensibilité aux coûts')
table(['Coût technique par pass','Contribution par pass','Pass pour couvrir 600 €'],[
('3 €','22 €','28'),('6 €','19 €','32'),('12 €','13 €','47')],[6.4,5.2,5.4])
p('Autres hypothèses inchangées : recette disponible 30 €, support valorisé 5 €. Une hausse du support, des remboursements ou de l’acquisition dégrade aussi ces seuils. Tester des usages intenses avant de promettre les volumes inclus.')
h('Lecture sur douze mois')
p('Construire ensuite un modèle mensuel par cohortes : nouveaux pass, dates d’expiration, coûts futurs des pass en cours et dépenses fixes. Ne pas assimiler un pass de 90 jours à du revenu mensuel récurrent ni multiplier mécaniquement une première fenêtre par quatre.')

#11
page('10 Indicateurs risques et décisions')
h('Tableau de pilotage minimal')
table(['Indicateur','Définition à conserver'],[
('Activation','Nouveaux comptes avec CV vérifié offre analysée puis lettre sauvegardée ou candidature préparée enregistrée ; séparer les deux variantes'),
('Temps de première valeur','Du début de l’import CV à la première analyse consultée ; distinguer attente technique et actions utilisateur'),
('Retour utile à J7','Activés ayant sept jours de recul qui préparent une autre offre ou mettent à jour une candidature'),
('Qualité','Erreurs factuelles critiques corrections nécessaires et livrables conservés avec dénominateur'),
('Coût et support','Coût par dossier et pass temps de support échecs et régénérations'),
('Vente','Paiements réels conversions et remboursements par cohorte et source')],[4.3,12.7])
h('Risques prioritaires')
bullet('Confidentialité ou accès croisé : bloquer l’ouverture et corriger avant toute nouvelle acquisition.')
bullet('Résultat faux ou générique : analyser les cas et améliorer le parcours ; ne pas compenser par une promesse marketing plus forte.')
bullet('Usage ponctuel sans retour : rechercher la valeur du premier livrable et un format de vente adapté au besoin temporaire.')
bullet('Coût élevé ou support trop lourd : réduire les volumes inclus et automatiser les erreurs fréquentes avant d’augmenter le trafic.')
bullet('Dépendance aux sources : garantir le chemin par texte collé et afficher les capacités réellement disponibles.')
h('Critères de décision proposés')
p('Pour une première itération, viser quatre testeurs sur cinq capables de terminer sans blocage critique et trois sur cinq choisissant de conserver un livrable utile. Ces seuils sont pratiques, non statistiques. Toute erreur critique de confidentialité ou de faits doit être corrigée avant extension.')
p('À J90, poursuivre si la valeur se répète, les coûts sont maîtrisés et des achats réels justifient la suite. Ajuster le segment ou l’offre si la compréhension est bonne mais l’utilité ou l’achat faibles. Suspendre l’acquisition si le socle ou la contribution ne permettent pas de servir correctement les utilisateurs.')

#12
page('11 Décisions à prendre et références')
h('Décisions du fondateur')
for t in [
'Choisir appjobs-v2 ou appjobs comme dépôt de référence et identifier le déploiement concerné.',
'Fixer le temps disponible chaque semaine et une date de départ réaliste.',
'Valider le périmètre de la première bêta et le mode de demande d’accès.',
'Définir le budget de validation et le plafond de consommation des services.',
'Identifier cinq candidats potentiels et préparer le protocole sans envoyer de sollicitation avant décision.',
'Mesurer les coûts puis choisir quotas prix et contenu avant la vente.',
'Vérifier identité de l’éditeur obligations applicables prestataires et conditions avant ouverture et encaissement.'
]:bullet(t)
h('Premier plan de travail')
p('Commencer par un inventaire du dépôt et du déploiement de référence, neutraliser le chemin d’authentification de développement et les diagnostics à risque, puis réparer les contrôles qualité. En parallèle, préparer le texte de la landing et un jeu fictif de démonstration. Cette séquence rend la future ouverture concrète sans publier de promesse prématurée.')
h('Références internes')
p('Dossier founder du 28 octobre 2026 : context, idea, board, consumer, pricing, pricing-curve, offer, pitch, competitors et résultats agrégés des deux panels. Les simulations servent à formuler des hypothèses ; elles ne constituent pas des entretiens ou achats réels.')
p('Revue du 31 octobre 2026 : founder/launch-review-2026-10-31/roadmap-lancement.md, captures et journaux des contrôles. Référence produit : docs/product.md. Points techniques : lib/local-auth.ts, lib/auth.ts, lib/supabase/middleware.ts, lib/ai/prompt-trace.ts et routes associées. Chemins relatifs à appjobs-v2.')
h('Références externes consultées le 31 octobre 2026')
p('Teal — offre et suivi gratuit : https://www.tealhq.com/pricing et https://help.tealhq.com/en/articles/9530153-teal-vs-teal')
p('Huntr — FAQ officielle et suivi gratuit : https://help.huntr.co/en/articles/9806024-faq')
p('CNIL — principes relatifs aux données de candidature : https://www.cnil.fr/fr/le-guide-du-recrutement. Le cadre d’un outil destiné au candidat doit être vérifié séparément ; les durées d’un vivier recruteur ne se transposent pas automatiquement.')
p('Les tarifs détaillés et avis concurrents du dossier founder n’ont pas tous été revérifiés. Le présent document n’établit ni conformité juridique ni rentabilité réelle ; ces points requièrent leurs vérifications et données propres.')

doc.save(OUT/'JobTracker_business_plan_et_plan_action.docx')
print(OUT/'JobTracker_business_plan_et_plan_action.docx')
