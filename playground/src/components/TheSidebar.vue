<script setup>
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { ChevronRightIcon } from '@heroicons/vue/20/solid'

const navigation = [
  { name: 'Dashboard', href: '#', current: true },
  {
    name: 'Teams',
    current: false,
    children: [
      { name: 'Engineering', href: '#' },
      { name: 'Human Resources', href: '#' },
      { name: 'Customer Success', href: '#' },
    ],
  },
  {
    name: 'Projects',
    current: false,
    children: [
      { name: 'GraphQL API', href: '#' },
      { name: 'iOS App', href: '#' },
      { name: 'Android App', href: '#' },
      { name: 'New Customer Portal', href: '#' },
    ],
  },
  { name: 'Calendar', href: '#', current: false },
  { name: 'Documents', href: '#', current: false },
  { name: 'Reports', href: '#', current: false },
]
</script>

<template>
  <div class="flex flex-col px-6 overflow-y-auto bg-white grow gap-y-5">
    <nav class="flex flex-col flex-1">
      <ul role="list" class="flex flex-col flex-1 gap-y-7">
        <li>
          <ul role="list" class="-mx-2 space-y-1">
            <li v-for="item in navigation" :key="item.name">
              <a
                v-if="!item.children"
                :href="item.href"
                class="block rounded-md py-2 pr-2 pl-10 text-sm leading-6 font-semibold text-gray-700"
                :class="[item.current ? 'bg-gray-50' : 'hover:bg-gray-50']"
              >{{ item.name }}</a>
              <Disclosure v-else v-slot="{ open }" as="div">
                <DisclosureButton
                  class="flex items-center w-full text-left rounded-md p-2 gap-x-3 text-sm leading-6 font-semibold text-gray-700"
                  :class="[item.current ? 'bg-gray-50' : 'hover:bg-gray-50']"
                >
                  <ChevronRightIcon
                    class="h-5 w-5 shrink-0"
                    :class="[open ? 'rotate-90 text-gray-500' : 'text-gray-400']"
                    aria-hidden="true"
                  />
                  {{ item.name }}
                </DisclosureButton>
                <DisclosurePanel as="ul" class="px-2 mt-1">
                  <li v-for="subItem in item.children" :key="subItem.name">
                    <DisclosureButton
                      as="a"
                      :href="subItem.href"
                      class="block rounded-md py-2 pr-2 pl-9 text-sm leading-6 text-gray-700"
                      :class="[subItem.current ? 'bg-gray-50' : 'hover:bg-gray-50']"
                    >
                      {{ subItem.name }}
                    </DisclosureButton>
                  </li>
                </DisclosurePanel>
              </Disclosure>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </div>
</template>
