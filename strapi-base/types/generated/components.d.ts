import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksBackgroundBlock extends Struct.ComponentSchema {
  collectionName: 'components_blocks_background_blocks';
  info: {
    description: 'Change le fond du site (couleur, image, gradient)';
    displayName: 'Background Block';
  };
  attributes: {
    color: Schema.Attribute.String;
    fixed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    gradient: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images' | 'files'>;
    imageDesktop: Schema.Attribute.Media<'images' | 'files'>;
    overlayColor: Schema.Attribute.String;
    overlayOpacity: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    positionDesktop: Schema.Attribute.Enumeration<
      [
        'center center',
        'top center',
        'top left',
        'top right',
        'bottom center',
        'bottom left',
        'bottom right',
        'left center',
        'right center',
      ]
    > &
      Schema.Attribute.DefaultTo<'center center'>;
    positionMobile: Schema.Attribute.Enumeration<
      [
        'center center',
        'top center',
        'top left',
        'top right',
        'bottom center',
        'bottom left',
        'bottom right',
        'left center',
        'right center',
      ]
    > &
      Schema.Attribute.DefaultTo<'center center'>;
    repeat: Schema.Attribute.Enumeration<
      ['no-repeat', 'repeat', 'repeat-x', 'repeat-y']
    > &
      Schema.Attribute.DefaultTo<'no-repeat'>;
    scope: Schema.Attribute.Enumeration<['section', 'global']> &
      Schema.Attribute.DefaultTo<'section'>;
    sizeDesktop: Schema.Attribute.Enumeration<['cover', 'contain', 'auto']> &
      Schema.Attribute.DefaultTo<'cover'>;
    sizeMobile: Schema.Attribute.Enumeration<['cover', 'contain', 'auto']> &
      Schema.Attribute.DefaultTo<'cover'>;
    type: Schema.Attribute.Enumeration<['color', 'image', 'gradient']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'color'>;
  };
}

export interface BlocksBlankBlock extends Struct.ComponentSchema {
  collectionName: 'components_blocks_blank_blocks';
  info: {
    description: 'Espace vide configurable entre deux blocks';
    displayName: 'Blank Block';
  };
  attributes: {
    size: Schema.Attribute.Enumeration<['small', 'medium', 'large', 'xlarge']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'medium'>;
  };
}

export interface BlocksButtonBlock extends Struct.ComponentSchema {
  collectionName: 'components_blocks_button_blocks';
  info: {
    description: 'One or multiple buttons with alignment';
    displayName: 'Button Block';
  };
  attributes: {
    alignment: Schema.Attribute.Enumeration<
      ['left', 'center', 'right', 'space-between']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'center'>;
    buttons: Schema.Attribute.Component<'shared.button', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    equalWidth: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    layout: Schema.Attribute.Enumeration<['horizontal', 'vertical']> &
      Schema.Attribute.DefaultTo<'horizontal'>;
  };
}

export interface BlocksCardsBlock extends Struct.ComponentSchema {
  collectionName: 'components_blocks_cards_blocks';
  info: {
    description: 'Display a grid of cards';
    displayName: 'Cards Block';
  };
  attributes: {
    alignment: Schema.Attribute.Enumeration<['left', 'center', 'right']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'center'>;
    cards: Schema.Attribute.Relation<'oneToMany', 'api::card.card'> &
      Schema.Attribute.Required;
    columns: Schema.Attribute.Enumeration<['1', '2', '3', '4']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'3'>;
    overlap: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface BlocksContactFormBlock extends Struct.ComponentSchema {
  collectionName: 'components_blocks_contact_form_blocks';
  info: {
    description: 'Contact form with name, email and message fields';
    displayName: 'Contact Form Block';
  };
  attributes: {
    blockAlignment: Schema.Attribute.Enumeration<
      ['left', 'center', 'right', 'full']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'center'>;
    consentRequiredText: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    consentText: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<"J'accepte que mes donn\u00E9es personnelles soient trait\u00E9es conform\u00E9ment \u00E0 la">;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    emailLabel: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Votre email'>;
    emailPlaceholder: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'votre@email.com'>;
    errorMessage: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'\u2717 Une erreur est survenue. Veuillez r\u00E9essayer.'>;
    maxWidth: Schema.Attribute.Enumeration<
      ['small', 'medium', 'large', 'full']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false;
        };
      }> &
      Schema.Attribute.DefaultTo<'medium'>;
    messageLabel: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Votre message'>;
    messagePlaceholder: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Votre message...'>;
    nameLabel: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Votre nom'>;
    namePlaceholder: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Votre nom'>;
    policyLinkText: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'politique de confidentialit\u00E9'>;
    privacyPolicy: Schema.Attribute.Relation<
      'oneToOne',
      'api::privacy-policy.privacy-policy'
    >;
    rgpdInfoText: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    submitButtonText: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Envoyer'>;
    submittingText: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Envoi en cours...'>;
    successMessage: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'\u2713 Votre message a \u00E9t\u00E9 envoy\u00E9 avec succ\u00E8s !'>;
    title: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }> &
      Schema.Attribute.DefaultTo<'Contactez-nous'>;
  };
}

export interface BlocksHeroBlockSimpleText extends Struct.ComponentSchema {
  collectionName: 'components_blocks_hero_block_simple_texts';
  info: {
    description: 'Hero section with optional title and text content';
    displayName: 'Hero Block Simple Text';
  };
  attributes: {
    content: Schema.Attribute.Text & Schema.Attribute.Required;
    height: Schema.Attribute.Enumeration<
      ['little', 'medium', 'large', 'full']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'large'>;
    textAlignment: Schema.Attribute.Enumeration<['left', 'center', 'right']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'center'>;
    title: Schema.Attribute.String;
  };
}

export interface BlocksImageBlock extends Struct.ComponentSchema {
  collectionName: 'components_blocks_image_blocks';
  info: {
    description: 'Image with caption and alignment';
    displayName: 'Image Block';
  };
  attributes: {
    alignment: Schema.Attribute.Enumeration<
      ['left', 'center', 'right', 'full']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'center'>;
    caption: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    size: Schema.Attribute.Enumeration<['small', 'medium', 'large', 'full']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'medium'>;
  };
}

export interface BlocksProductListBlock extends Struct.ComponentSchema {
  collectionName: 'components_blocks_product_list_blocks';
  info: {
    description: 'Grille de produits avec filtres par cat\u00E9gorie (e-commerce)';
    displayName: 'Product List Block';
  };
  attributes: {
    category: Schema.Attribute.Relation<
      'oneToOne',
      'api::product-category.product-category'
    >;
    maxItems: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<12>;
    showFilters: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface BlocksTextBlock extends Struct.ComponentSchema {
  collectionName: 'components_blocks_text_blocks';
  info: {
    description: 'Rich text content block';
    displayName: 'Text Block';
  };
  attributes: {
    blockAlignment: Schema.Attribute.Enumeration<
      ['left', 'center', 'right', 'full']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'full'>;
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
    maxWidth: Schema.Attribute.Enumeration<
      ['small', 'medium', 'large', 'full']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'full'>;
    textAlignment: Schema.Attribute.Enumeration<
      ['left', 'center', 'right', 'justify']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'left'>;
  };
}

export interface BlocksTextImageBlock extends Struct.ComponentSchema {
  collectionName: 'components_blocks_text_image_blocks';
  info: {
    description: 'Combine text content with an image side by side';
    displayName: 'Text + Image Block';
  };
  attributes: {
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
    imagePosition: Schema.Attribute.Enumeration<['left', 'right']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'right'>;
    images: Schema.Attribute.Media<'images', true>;
    imageSize: Schema.Attribute.Enumeration<['small', 'medium', 'large']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'medium'>;
    roundedImage: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    textAlignment: Schema.Attribute.Enumeration<
      ['left', 'center', 'right', 'justify']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'left'>;
    verticalAlignment: Schema.Attribute.Enumeration<
      ['top', 'center', 'bottom']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'center'>;
  };
}

export interface SharedButton extends Struct.ComponentSchema {
  collectionName: 'components_shared_buttons';
  info: {
    description: 'Call-to-action button with customizable style and link';
    displayName: 'Button';
  };
  attributes: {
    file: Schema.Attribute.Media<'files' | 'images'>;
    icon: Schema.Attribute.String;
    isExternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String;
    variant: Schema.Attribute.Enumeration<
      ['primary', 'secondary', 'outline', 'ghost']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'primary'>;
  };
}

export interface SharedCarouselCard extends Struct.ComponentSchema {
  collectionName: 'components_shared_carousel_cards';
  info: {
    description: 'Card with front and back content for carousel';
    displayName: 'Carousel Card';
  };
  attributes: {
    backContent: Schema.Attribute.Blocks;
    frontContent: Schema.Attribute.Blocks;
    frontTitle: Schema.Attribute.String & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedExternalLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_external_links';
  info: {
    description: 'A link to an external URL';
    displayName: 'External Link';
    icon: 'external-link-alt';
  };
  attributes: {
    label: Schema.Attribute.String;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedPageLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_page_links';
  info: {
    description: 'Link to a page with automatic slug resolution';
    displayName: 'page-link';
  };
  attributes: {
    customLabel: Schema.Attribute.String;
    page: Schema.Attribute.Relation<'oneToOne', 'api::page.page'>;
    section: Schema.Attribute.Relation<'oneToOne', 'api::section.section'>;
  };
}

export interface SharedTimelineImage extends Struct.ComponentSchema {
  collectionName: 'components_shared_timeline_images';
  info: {
    description: 'An image for the timeline with an optional external link';
    displayName: 'Timeline Image';
    icon: 'image';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    link: Schema.Attribute.Component<'shared.external-link', false>;
  };
}

export interface SharedTimelineItem extends Struct.ComponentSchema {
  collectionName: 'components_common_timeline_items';
  info: {
    description: 'A single item/step in the timeline.';
    displayName: 'Timeline Item';
    icon: 'dot-circle';
  };
  attributes: {
    date: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    images: Schema.Attribute.Component<'shared.timeline-image', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ShopOrderLineItem extends Struct.ComponentSchema {
  collectionName: 'components_shop_order_line_items';
  info: {
    description: 'A single product line in an order';
    displayName: 'Order Line Item';
  };
  attributes: {
    productId: Schema.Attribute.String & Schema.Attribute.Required;
    productName: Schema.Attribute.String & Schema.Attribute.Required;
    productSlug: Schema.Attribute.String;
    quantity: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    total: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    unitPrice: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
  };
}

export interface ShopShippingAddress extends Struct.ComponentSchema {
  collectionName: 'components_shop_shipping_addresses';
  info: {
    description: 'Customer shipping address';
    displayName: 'Shipping Address';
  };
  attributes: {
    address1: Schema.Attribute.String & Schema.Attribute.Required;
    address2: Schema.Attribute.String;
    city: Schema.Attribute.String & Schema.Attribute.Required;
    country: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'FR'>;
    firstName: Schema.Attribute.String & Schema.Attribute.Required;
    lastName: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
    postalCode: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface WatchFileAudioBlock extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_audio_blocks';
  info: {
    description: 'Bloc audio pour le dossier de restauration';
    displayName: 'Dossier Audio';
  };
  attributes: {
    audio: Schema.Attribute.Media<'audios'> & Schema.Attribute.Required;
    content: Schema.Attribute.Blocks;
    title: Schema.Attribute.String;
  };
}

export interface WatchFileBeforeAfterBlock extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_before_after_blocks';
  info: {
    description: 'Comparaison avant apr\u00E8s dans le dossier de restauration';
    displayName: 'Dossier Before / After';
  };
  attributes: {
    afterImage: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    beforeImage: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    content: Schema.Attribute.Blocks;
    title: Schema.Attribute.String;
  };
}

export interface WatchFileControleQualiteMesures
  extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_controle_qualite_mesures';
  info: {
    description: 'Point 4 du dossier avec mesures detaillees et resume public';
    displayName: '4. Controle qualite & mesures';
  };
  attributes: {
    etancheitePublique: Schema.Attribute.String;
    marcheMoyennePublique: Schema.Attribute.String;
    observationsConclusions: Schema.Attribute.Text;
    reglageEtPrecision: Schema.Attribute.Component<
      'watch-file.ligne-reglage-position',
      true
    >;
    testEtancheite: Schema.Attribute.Component<
      'watch-file.ligne-test-etancheite',
      true
    >;
  };
}

export interface WatchFileEtatGeneral extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_etat_generals';
  info: {
    description: 'Point 2 du dossier avec resume global et observations detaillees';
    displayName: '2. Etat a la reception';
  };
  attributes: {
    etatGeneralGlobal: Schema.Attribute.Component<
      'watch-file.etat-general-global',
      false
    >;
    etatVisuelComposants: Schema.Attribute.Component<
      'watch-file.ligne-composant-observation',
      true
    >;
    fonctionnementAvantIntervention: Schema.Attribute.Component<
      'watch-file.ligne-observation-constat',
      true
    >;
  };
}

export interface WatchFileEtatGeneralGlobal extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_etat_general_globals';
  info: {
    description: "Resume global de l'etat general visible sur la fiche produit";
    displayName: 'Resume global fiche produit';
  };
  attributes: {
    boitier: Schema.Attribute.Component<
      'watch-file.indicateur-etat-general',
      false
    >;
    bracelet: Schema.Attribute.Component<
      'watch-file.indicateur-etat-general',
      false
    >;
    cadran: Schema.Attribute.Component<
      'watch-file.indicateur-etat-general',
      false
    >;
    mouvement: Schema.Attribute.Component<
      'watch-file.indicateur-etat-general',
      false
    >;
  };
}

export interface WatchFileImageBlock extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_image_blocks';
  info: {
    description: 'Bloc image simple pour le dossier de restauration';
    displayName: 'Dossier Image';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface WatchFileIndicateurEtatGeneral extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_indicateur_etat_generals';
  info: {
    description: 'Pourcentage et commentaire court pour une rubrique du resume global';
    displayName: 'Indicateur resume global';
  };
  attributes: {
    commentaire: Schema.Attribute.String;
    pourcentage: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
  };
}

export interface WatchFileLigneComposantObservation
  extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_ligne_composant_observations';
  info: {
    description: 'Ligne du tableau etat visuel des composants';
    displayName: 'Ligne composant / observation';
  };
  attributes: {
    composant: Schema.Attribute.String & Schema.Attribute.Required;
    observations: Schema.Attribute.Text;
  };
}

export interface WatchFileLigneObservationConstat
  extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_ligne_observation_constats';
  info: {
    description: 'Ligne du tableau fonctionnement avant intervention';
    displayName: 'Ligne observation / constat';
  };
  attributes: {
    constat: Schema.Attribute.Text;
    observation: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface WatchFileLigneOperationReparation
  extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_ligne_operation_reparations';
  info: {
    description: 'Ligne du tableau 3.1 operations effectuees';
    displayName: 'Ligne operation de reparation';
  };
  attributes: {
    observations: Schema.Attribute.Text;
    operation: Schema.Attribute.String & Schema.Attribute.Required;
    realisee: Schema.Attribute.Boolean;
  };
}

export interface WatchFileLigneReglagePosition extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_ligne_reglage_positions';
  info: {
    description: 'Ligne du tableau 4.1 reglage et precision';
    displayName: 'Ligne reglage / position';
  };
  attributes: {
    amplitude: Schema.Attribute.String;
    beatError: Schema.Attribute.String;
    frequence: Schema.Attribute.String;
    position: Schema.Attribute.String & Schema.Attribute.Required;
    rate: Schema.Attribute.String;
    resultat: Schema.Attribute.String;
  };
}

export interface WatchFileLigneTestEtancheite extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_ligne_test_etancheites';
  info: {
    description: "Ligne du tableau 4.2 test d'etancheite";
    displayName: 'Ligne test etancheite';
  };
  attributes: {
    observations: Schema.Attribute.Text;
    test: Schema.Attribute.String & Schema.Attribute.Required;
    valeurResultat: Schema.Attribute.String;
  };
}

export interface WatchFileOperationsReparation extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_operations_reparations';
  info: {
    description: 'Point 3 du dossier avec resume public et details atelier';
    displayName: '3. Operations de reparation';
  };
  attributes: {
    operationsEffectuees: Schema.Attribute.Component<
      'watch-file.ligne-operation-reparation',
      true
    >;
    operationsPubliques: Schema.Attribute.Text;
    piecesRemplacees: Schema.Attribute.Component<
      'watch-file.piece-remplacee',
      true
    >;
  };
}

export interface WatchFilePieceRemplacee extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_piece_remplacees';
  info: {
    description: 'Ligne du tableau 3.2 pieces remplacees';
    displayName: 'Piece remplacee';
  };
  attributes: {
    designationPiece: Schema.Attribute.String;
    etatPiece: Schema.Attribute.Enumeration<['orig', 'rep']>;
    origine: Schema.Attribute.String;
    quantite: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    referenceCalibre: Schema.Attribute.String;
  };
}

export interface WatchFilePublicBadge extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_public_badges';
  info: {
    description: 'Badge public affiche sur la fiche produit';
    displayName: 'Badge public';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface WatchFileRichTextBlock extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_rich_text_blocks';
  info: {
    description: 'Section texte riche pour le dossier de restauration';
    displayName: 'Dossier Rich Text';
  };
  attributes: {
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface WatchFileTextImageBlock extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_text_image_blocks';
  info: {
    description: 'Bloc texte et image pour le dossier de restauration';
    displayName: 'Dossier Text + Image';
  };
  attributes: {
    content: Schema.Attribute.Blocks & Schema.Attribute.Required;
    imagePosition: Schema.Attribute.Enumeration<['left', 'right']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'right'>;
    images: Schema.Attribute.Media<'images', true>;
    title: Schema.Attribute.String;
  };
}

export interface WatchFileValidationAtelier extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_validation_ateliers';
  info: {
    description: 'Validation finale atelier du dossier de restauration';
    displayName: '5. Validation atelier';
  };
  attributes: {
    dateFin: Schema.Attribute.Date;
    dateSignature: Schema.Attribute.Date;
    dureeIntervention: Schema.Attribute.String;
    signature: Schema.Attribute.Media<'images'>;
  };
}

export interface WatchFileVideoBlock extends Struct.ComponentSchema {
  collectionName: 'components_watch_file_video_blocks';
  info: {
    description: 'Bloc video pour le dossier de restauration';
    displayName: 'Dossier Video';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
    title: Schema.Attribute.String;
    video: Schema.Attribute.Media<'videos'> & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'blocks.background-block': BlocksBackgroundBlock;
      'blocks.blank-block': BlocksBlankBlock;
      'blocks.button-block': BlocksButtonBlock;
      'blocks.cards-block': BlocksCardsBlock;
      'blocks.contact-form-block': BlocksContactFormBlock;
      'blocks.hero-block-simple-text': BlocksHeroBlockSimpleText;
      'blocks.image-block': BlocksImageBlock;
      'blocks.product-list-block': BlocksProductListBlock;
      'blocks.text-block': BlocksTextBlock;
      'blocks.text-image-block': BlocksTextImageBlock;
      'shared.button': SharedButton;
      'shared.carousel-card': SharedCarouselCard;
      'shared.external-link': SharedExternalLink;
      'shared.page-link': SharedPageLink;
      'shared.timeline-image': SharedTimelineImage;
      'shared.timeline-item': SharedTimelineItem;
      'shop.order-line-item': ShopOrderLineItem;
      'shop.shipping-address': ShopShippingAddress;
      'watch-file.audio-block': WatchFileAudioBlock;
      'watch-file.before-after-block': WatchFileBeforeAfterBlock;
      'watch-file.controle-qualite-mesures': WatchFileControleQualiteMesures;
      'watch-file.etat-general': WatchFileEtatGeneral;
      'watch-file.etat-general-global': WatchFileEtatGeneralGlobal;
      'watch-file.image-block': WatchFileImageBlock;
      'watch-file.indicateur-etat-general': WatchFileIndicateurEtatGeneral;
      'watch-file.ligne-composant-observation': WatchFileLigneComposantObservation;
      'watch-file.ligne-observation-constat': WatchFileLigneObservationConstat;
      'watch-file.ligne-operation-reparation': WatchFileLigneOperationReparation;
      'watch-file.ligne-reglage-position': WatchFileLigneReglagePosition;
      'watch-file.ligne-test-etancheite': WatchFileLigneTestEtancheite;
      'watch-file.operations-reparation': WatchFileOperationsReparation;
      'watch-file.piece-remplacee': WatchFilePieceRemplacee;
      'watch-file.public-badge': WatchFilePublicBadge;
      'watch-file.rich-text-block': WatchFileRichTextBlock;
      'watch-file.text-image-block': WatchFileTextImageBlock;
      'watch-file.validation-atelier': WatchFileValidationAtelier;
      'watch-file.video-block': WatchFileVideoBlock;
    }
  }
}
