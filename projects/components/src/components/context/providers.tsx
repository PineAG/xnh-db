import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { ReactNode } from 'react';

const theme = extendTheme({
    useSystemColorMode: true,
    components: {
        Button: {
            defaultProps: {
                colorScheme: 'teal'
            },
        }
    }
})

export function DBWebUIProvider(props: {children: ReactNode}) {
    return <ChakraProvider theme={theme}>
        {props.children}
    </ChakraProvider>
}