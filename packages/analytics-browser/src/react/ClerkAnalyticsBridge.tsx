'use client'

import { useAuth, useOrganization, useUser } from '@clerk/nextjs'
import type * as React from 'react'
import { useEffect } from 'react'
import { useAnalytics } from './AnalyticsProvider'
import { useIdentify } from './useIdentify'

/**
 * Bridge component that connects Clerk user authentication and organization
 * state to analytics identification and grouping.
 */
export const ClerkAnalyticsBridge: React.FC = () => {
  const { user, isLoaded: userLoaded } = useUser()
  const { isSignedIn } = useAuth()
  const { organization, isLoaded: orgLoaded } = useOrganization()
  const analytics = useAnalytics()

  // 1. Identify the user
  useIdentify(
    userLoaded && isSignedIn && user ? user.id : undefined,
    userLoaded && isSignedIn && user
      ? {
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
        }
      : undefined,
  )

  // 2. Associate with organization (Group Analytics)
  useEffect(() => {
    if (orgLoaded && organization && analytics) {
      analytics.group('organization', organization.id, {
        name: organization.name,
        slug: organization.slug,
      })
    }
  }, [orgLoaded, organization, analytics])

  return null
}

export default ClerkAnalyticsBridge
