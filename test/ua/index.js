import { create } from 'stamp'
import { device } from 'vigour-ua/navigator'

if (device === 'phone') {
  console.log(device)
} else {
  console.log(create())
}
