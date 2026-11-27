import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .section-label {
    font-size: 0.875rem;
    font-weight: 500;
    display: block;
  }
`;

export default StyledWrapper;
