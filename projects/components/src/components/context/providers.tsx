import { ChakraProvider } from '@chakra-ui/react'
import { ReactNode } from 'react';

export function DBWebUIProvider(props: {children: ReactNode}) {
    return <ChakraProvider>
        {props.children}
    </ChakraProvider>
}