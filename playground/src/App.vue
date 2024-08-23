<script setup lang="ts"></script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">
          Home
        </RouterLink>
        |
        <RouterLink to="/contacts">
          Contacts
        </RouterLink>
        |
        <RouterLink to="/warnings">
          Warnings
        </RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>
