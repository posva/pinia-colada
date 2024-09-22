import { mande, type Options } from 'mande'

export const products = mande('http://localhost:7777/products', {})

/**
 * Retrieve all the contact list.
 */
export async function getAllProducts(options?: Options<'json'>) {
  // await new Promise(resolve => setTimeout(resolve, 2000))
  return (await products.get<ProductListItem[]>('/', options)).map(
    (product) => ({
      id: product.id,
      name: product.name,
      color: product.color,
      imagesrc: product.imageSrc,
      price: product.price,
      availability: product.availability,
    }),
  )
}

/**
 * Get the information of a contact by using its id.
 *
 * @param id id of the contact
 */
export function getProductById(id: string | number, options?: Options<'json'>) {
  return products.get<ProductT>(id, options)
}

export async function changeProductAvailability(
  product: ProductListItem,
  options?: Options<'json'>,
) {
  if (product.availability < 1) {
    throw new Error('Product not available')
  }
  return products.patch<ProductT>(
    product.id,
    {
      availability: product.availability - 1,
    },
    options,
  )
}

export interface ProductListItem {
  id: string
  name: string
  price: number
  color: string
  availability: number
  size: string
  imageSrc: string
  imageAlt: string
}

export interface ProductT extends ProductListItem {
  rating: number
  description: string
}
