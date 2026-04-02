import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Copy } from 'lucide-react-native';
import {
    FadeIn,
    FadeOut,
    ZoomIn,
    ZoomOut,
} from 'react-native-reanimated';
import PoppinsText from '../ui/text/PoppinsText';
import Row from '../layout/Row';
import StateAnimatedView from '../ui/StateAnimatedView';

interface CopyableTextProps {
    text: string;
    prefix?: string;
    className?: string;
    copyText?: string;
}

const CopyableText = ({ text, prefix = '', className = '', copyText = 'Copied' }: CopyableTextProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const fullText = `${prefix}${text}`;

    return (
        <TouchableOpacity onPress={handleCopy}>
            <Row className={`items-center justify-center w-fit  ${className}`} gap={2}>
                <View className="items-center">
                    <PoppinsText varient='cardHeader' style={{ color: 'transparent' }}>
                        {fullText}
                    </PoppinsText>



                    <View className="absolute">
                        <StateAnimatedView.Container stateVar={copied}>
                            <StateAnimatedView.Option
                                stateValue={false}
                                onValue={FadeIn.duration(100)}
                                onNotValue={FadeOut.duration(100)}
                            >
                                <PoppinsText varient='lowercaseCardHeader'>
                                    {fullText}
                                </PoppinsText>
                            </StateAnimatedView.Option>

                            <StateAnimatedView.Option
                                stateValue={true}
                                onValue={ZoomIn.duration(150)}
                                onNotValue={ZoomOut.duration(150)}
                            >

                                <PoppinsText varient='cardHeader'>
                                    {copyText}
                                </PoppinsText>

                            </StateAnimatedView.Option>
                        </StateAnimatedView.Container>
                    </View>
                </View>
                <Copy size={12} color="#666" />
            </Row>
        </TouchableOpacity>
    );
};

export default CopyableText;
