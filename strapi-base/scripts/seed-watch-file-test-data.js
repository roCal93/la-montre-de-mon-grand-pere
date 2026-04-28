const { compileStrapi, createStrapi } = require('@strapi/strapi');

function isIgnorableAbort(error) {
    return error instanceof Error && error.message === 'aborted';
}

process.on('uncaughtException', (error) => {
    if (isIgnorableAbort(error)) {
        process.exit(0);
    }

    throw error;
});

process.on('unhandledRejection', (reason) => {
    if (isIgnorableAbort(reason)) {
        process.exit(0);
    }

    throw reason;
});

function makeParagraph(text) {
    return [
        {
            type: 'paragraph',
            children: [{ type: 'text', text }],
        },
    ];
}

async function safeDestroy(strapi) {
    try {
        await strapi.destroy();
    } catch (error) {
        if (isIgnorableAbort(error)) {
            return;
        }

        throw error;
    }
}

async function main() {
    const reference = process.argv[2] || 'MGP0001';
    const appContext = await compileStrapi({ ignoreDiagnostics: true });
    const strapi = createStrapi(appContext);

    try {
        await strapi.load();

        const entry = await strapi.db.query('api::watch-file.watch-file').findOne({
            where: { reference },
            select: ['id', 'documentId', 'reference'],
        });

        if (!entry?.documentId) {
            throw new Error(`Watch-file not found for reference ${reference}`);
        }

        const availableMedia = await strapi.db.query('plugin::upload.file').findMany({
            select: ['id', 'name', 'mime'],
            orderBy: { id: 'desc' },
            limit: 10,
        });

        const mediaIds = availableMedia
            .filter((file) => typeof file.id === 'number')
            .map((file) => file.id);

        const [signatureId, textImageId, beforeId, afterId] = mediaIds;

        const updatePayload = {
            marketingShortDescription:
                'Montre de collection revisee en atelier, controlee et prete a porter.',
            marketingDescription:
                '<p>Cette Europ Union a fait l\'objet d\'une reprise complete en atelier avec controle esthetique, verification de marche et tests finaux avant mise a disposition.</p><p>Le dossier de restauration documente l\'etat initial, les interventions realisees et les mesures de controle apres remise en etat.</p>',
            publicBadges: [
                { label: 'Revision atelier' },
                { label: 'Controlee' },
                { label: 'Piece vintage' },
            ],
            notesIdentification:
                'Montre mecanique vintage identifiee a l\'atelier sur la base du boitier, du calibre et des marquages observes lors de l\'ouverture.',
            etatGeneral: {
                etatGeneralGlobal: {
                    boitier: { pourcentage: 82, commentaire: 'Bel etat d\'ensemble' },
                    cadran: { pourcentage: 76, commentaire: 'Patine reguliere' },
                    mouvement: { pourcentage: 88, commentaire: 'Fonctionnement sain' },
                    bracelet: { pourcentage: 71, commentaire: 'Portable apres nettoyage' },
                },
                fonctionnementAvantIntervention: [
                    {
                        observation: 'Mise en marche',
                        constat: 'Demarrage possible mais amplitude irreguliere et reserve de marche reduite.',
                    },
                    {
                        observation: 'Passage de date',
                        constat: 'Changement de date fonctionnel avec declenchement legerement tardif.',
                    },
                    {
                        observation: 'Remontage / mise a l\'heure',
                        constat: 'Commande utilisable mais sensation de frottement a la couronne.',
                    },
                ],
                etatVisuelComposants: [
                    {
                        composant: 'Boitier',
                        observations: 'Micro-rayures d\'usage, angles encore bien presents.',
                    },
                    {
                        composant: 'Cadran',
                        observations: 'Patine homogene avec traces discretes autour des index.',
                    },
                    {
                        composant: 'Aiguilles',
                        observations: 'Ensemble coherent, leger vieillissement de surface.',
                    },
                    {
                        composant: 'Mouvement',
                        observations: 'Etat propre mais lubrification ancienne a reprendre.',
                    },
                ],
            },
            operationsReparation: {
                operationsPubliques:
                    'Revision complete du mouvement, nettoyage de l\'habillage et controle final de fonctionnement.',
                operationsEffectuees: [
                    {
                        operation: 'Demontage complet du mouvement',
                        realisee: true,
                        observations: 'Controle individuel des organes et tri des pieces d\'usure.',
                    },
                    {
                        operation: 'Nettoyage ultrasons et relubrification',
                        realisee: true,
                        observations: 'Nettoyage integral puis huilage aux points utiles.',
                    },
                    {
                        operation: 'Reglage de l\'echappement et controle de marche',
                        realisee: true,
                        observations: 'Amelioration de l\'amplitude et stabilisation de la marche.',
                    },
                ],
                piecesRemplacees: [
                    {
                        designationPiece: 'Ressort de barillet',
                        referenceCalibre: 'Cal. 2414',
                        quantite: 1,
                        origine: 'Stock atelier',
                        etatPiece: 'rep',
                    },
                    {
                        designationPiece: 'Joint de fond',
                        referenceCalibre: 'Boitier 38 mm',
                        quantite: 1,
                        origine: 'Fourniture neuve',
                        etatPiece: 'rep',
                    },
                ],
            },
            controleQualiteMesures: {
                marcheMoyennePublique: '+8 s/j',
                etancheitePublique: '3 ATM',
                reglageEtPrecision: [
                    {
                        position: 'Cadran haut',
                        rate: '+7 s/j',
                        amplitude: '268°',
                        beatError: '0.2 ms',
                        frequence: '18000 A/h',
                        resultat: 'Stable',
                    },
                    {
                        position: 'Cadran bas',
                        rate: '+9 s/j',
                        amplitude: '261°',
                        beatError: '0.3 ms',
                        frequence: '18000 A/h',
                        resultat: 'Stable',
                    },
                    {
                        position: 'Couronne bas',
                        rate: '+8 s/j',
                        amplitude: '255°',
                        beatError: '0.2 ms',
                        frequence: '18000 A/h',
                        resultat: 'Conforme',
                    },
                ],
                testEtancheite: [
                    {
                        test: 'Test depression',
                        valeurResultat: 'OK',
                        observations: 'Aucune variation anormale relevee.',
                    },
                    {
                        test: 'Test pression faible',
                        valeurResultat: '3 ATM',
                        observations: 'Validation usage courant hors immersion prolongee.',
                    },
                ],
                observationsConclusions:
                    'Les mesures sont coherentes pour une montre vintage de cette generation. La marche reste stable apres revision et les controles d\'usage courant sont satisfaisants.',
            },
            validationAtelier: {
                dateFin: '2026-04-27',
                dureeIntervention: '6 h 30',
                ...(signatureId ? { signature: signatureId } : {}),
                dateSignature: '2026-04-27',
            },
            ...(beforeId ? { publicBeforeImage: [beforeId] } : {}),
            ...(afterId ? { publicAfterImage: [afterId] } : {}),
            dossierBlocks: [
                {
                    __component: 'watch-file.rich-text-block',
                    title: 'Synthese atelier',
                    content: makeParagraph(
                        'Cette intervention a permis de restituer un fonctionnement regulier tout en preservant le caractere vintage de la montre.'
                    ),
                },
                ...(textImageId
                    ? [
                        {
                            __component: 'watch-file.text-image-block',
                            title: 'Focus sur l\'habillage',
                            content: makeParagraph(
                                'Le nettoyage de l\'habillage a ete volontairement mesuré afin de conserver la lecture historique de la piece.'
                            ),
                            image: textImageId,
                            imagePosition: 'right',
                        },
                    ]
                    : []),
                ...(beforeId && afterId
                    ? [
                        {
                            __component: 'watch-file.before-after-block',
                            title: 'Comparatif avant / apres',
                            beforeImage: beforeId,
                            afterImage: afterId,
                        },
                    ]
                    : []),
            ],
        };

        await strapi.documents('api::watch-file.watch-file').update({
            documentId: entry.documentId,
            data: updatePayload,
        });

        console.log(
            JSON.stringify(
                {
                    ok: true,
                    reference,
                    documentId: entry.documentId,
                    mediaIdsUsed: {
                        signatureId: signatureId || null,
                        textImageId: textImageId || null,
                        beforeId: beforeId || null,
                        afterId: afterId || null,
                    },
                },
                null,
                2
            )
        );
    } finally {
        await safeDestroy(strapi);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});