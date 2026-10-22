# Images

Every `.jpg` in this folder is an **AI-generated illustrative stand-in**, not a
photograph of Tandooriwala Bhadrak. They exist so the layout, type scale and
image treatment can be reviewed before real photography is available.

## Replacing them

1. Drop the real photo in this folder named exactly `slug-800.jpg`
   (and optionally `slug-480.jpg`, `slug-1200.jpg`, `slug-1600.jpg`).
2. Or put originals in `vibe_images/` as `slug.png` and run:

```
node scripts/optimize-images.mjs
```

That regenerates the responsive widths and rewrites `src/data/imageManifest.ts`,
which is what the `<DishImage>` component reads to build `srcset`.

## Slugs in use

| Slug | Used on |
| --- | --- |
| `hero-tandoori` | Home hero || `dish-tandoori-chicken` | Menu: Tandoori Starters, About |
| `dish-kebabs` | Menu: Kebabs, About |
| `dish-curry` | Menu: Curries, Home story |
| `dish-biryani` | Menu: Biryani, Home story |
| `dish-chinese` | Menu: Indo-Chinese, About |
| `dish-seafood` | Menu: Seafood, About |
| `atmosphere-tandoor` | Menu: Breads, About sticky column |
| `dish-dessert` | Menu: Desserts |
| `dish-drinks` | Menu: Drinks, Contact |
| `spread-table` | Visit, `og-cover.jpg` source |
| `og-cover` | Social sharing card |

`hero-tandoori` is the one crop-sensitive image: the desktop hero paints it as a
wide print (roughly 3:2) and mobile crops it into a tall arch, so keep the subject
centred in a landscape original or the phone crop will cut it off.


Alt text in the app already says "Illustrative photo" so the placeholder status
is visible to screen-reader users too.
