window.addEventListener("pageswap", async (e) => {
    if (e.viewTransition) {
        const transitionType = determineTransitionType(e.activation.from, e.activation.entry)
        e.viewTransition.types.add(transitionType)
    }
})

window.addEventListener("pagereveal", async (e) => {
    if (e.viewTransition) {
        const transitionType = determineTransitionType(navigation.activation.from, navigation.activation.entry)
        e.viewTransition.types.add(transitionType)
    }
})

const determineTransitionType = (oldNavigationEntry, newNavigationEntry) => {
    if (!oldNavigationEntry || !newNavigationEntry) {
        return 'unknown'
    }

    const currentURL = new URL(oldNavigationEntry.url)
    const destinationURL = new URL(newNavigationEntry.url)

    const currentPathname = currentURL.pathname
    const destinationPathname = destinationURL.pathname

    if (currentPathname === destinationPathname) {
        return 'reload'
    } else {

        if (currentPathname === '/open') {
            return 'from-open'
        }
        if (destinationPathname === '/open') {
            return 'to-open'
        }
        return 'unknown'
    }
}