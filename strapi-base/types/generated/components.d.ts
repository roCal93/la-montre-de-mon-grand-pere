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
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    imagePosition: Schema.Attribute.Enumeration<['left', 'right']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'right'>;
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
    }
  }
}
