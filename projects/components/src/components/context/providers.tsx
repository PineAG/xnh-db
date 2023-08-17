import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { DBConfig } from '@xnh-db/common';
import { ReactNode } from 'react';
import { ConfigContexts } from './config';

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

interface ProviderProps {
    children: ReactNode 
    documentTypes: Record<string, DBConfig.ConfigBase>
}

export function DBWebUIProvider(props: ProviderProps) {
    return <ConfigContexts.DocumentTypeContext.Provider value={props.documentTypes}>
        <ChakraProvider theme={theme}>
            {props.children}
        </ChakraProvider>
    </ConfigContexts.DocumentTypeContext.Provider>
}
